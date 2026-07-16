import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { readJson, requireSameOrigin } from "@/lib/server/request";

export interface AccountSnapshot {
  settings?: Record<string, unknown>;
  progress?: Array<{ algorithmSlug: string; categoryId: string; attempts: number; correct: number; mistakes?: number; lastSeen?: number }>;
  learner?: { xp?: number; streak?: number; gamification?: boolean; achievements?: string[] };
  events?: Array<{ id: string; type: "attempt" | "study"; slug: string; category: string; correct?: boolean; createdAt: number }>;
  savedVisualizations?: Array<{ slug: string; label?: string; payload: unknown }>;
  savedComparisons?: Array<{ key: string; label?: string; payload: unknown }>;
}

const MAX_RECORDS = 1_000;
const MAX_SAVES = 100;
const validText = (value: unknown, max = 160) => typeof value === "string" && value.length > 0 && value.length <= max;
const validCount = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000;
const optionalCount = (value: unknown) => value === undefined || validCount(value);

function isValidSnapshot(snapshot: AccountSnapshot | null): snapshot is AccountSnapshot {
  if (!snapshot || typeof snapshot !== "object") return false;
  if ((snapshot.events?.length ?? 0) > MAX_RECORDS || (snapshot.progress?.length ?? 0) > MAX_RECORDS || (snapshot.savedVisualizations?.length ?? 0) > MAX_SAVES || (snapshot.savedComparisons?.length ?? 0) > MAX_SAVES) return false;
  if (snapshot.settings && (typeof snapshot.settings !== "object" || Array.isArray(snapshot.settings) || JSON.stringify(snapshot.settings).length > 32_000)) return false;
  if (snapshot.learner && (!optionalCount(snapshot.learner.xp) || !optionalCount(snapshot.learner.streak) || (snapshot.learner.gamification !== undefined && typeof snapshot.learner.gamification !== "boolean") || (snapshot.learner.achievements !== undefined && (!Array.isArray(snapshot.learner.achievements) || snapshot.learner.achievements.length > MAX_RECORDS || !snapshot.learner.achievements.every((key) => validText(key)))))) return false;
  return (snapshot.progress ?? []).every((record) => validText(record.algorithmSlug) && validText(record.categoryId) && validCount(record.attempts) && validCount(record.correct) && record.correct <= record.attempts && (record.mistakes === undefined || validCount(record.mistakes)) && (record.lastSeen === undefined || validCount(record.lastSeen)))
    && (snapshot.events ?? []).every((event) => validText(event.id) && validText(event.slug) && validText(event.category) && (event.type === "attempt" || event.type === "study") && (event.correct === undefined || typeof event.correct === "boolean") && validCount(event.createdAt))
    && (snapshot.savedVisualizations ?? []).every((save) => validText(save.slug) && (!save.label || validText(save.label)) && JSON.stringify(save.payload).length <= 64_000)
    && (snapshot.savedComparisons ?? []).every((save) => validText(save.key) && (!save.label || validText(save.label)) && JSON.stringify(save.payload).length <= 64_000);
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const db = getDb();
    const [profile, progress, visuals, comparisons, achievements, events, sessions] = await Promise.all([
      db.query("select settings, xp, level, streak, gamification_enabled from users where id = $1", [user.id]),
      db.query("select algorithm_slug, category_id, attempts, correct, mistakes, extract(epoch from last_seen_at) * 1000 as last_seen from user_progress where user_id = $1", [user.id]),
      db.query("select slug, label, payload from saved_visualizations where user_id = $1", [user.id]),
      db.query("select client_key as key, label, payload from saved_comparisons where user_id = $1", [user.id]),
      db.query("select achievement_key from achievements where user_id = $1", [user.id]),
      db.query("select qa.client_event_id as id, qa.algorithm_slug as slug, up.category_id as category, qa.correct, extract(epoch from qa.created_at) * 1000 as created_at from quiz_attempts qa left join user_progress up on up.user_id = qa.user_id and up.algorithm_slug = qa.algorithm_slug where qa.user_id = $1 and qa.client_event_id is not null", [user.id]),
      db.query("select client_event_id as id, algorithm_slug as slug, extract(epoch from created_at) * 1000 as created_at from study_sessions where user_id = $1 and client_event_id is not null", [user.id]),
    ]);
    return NextResponse.json({ profile: profile.rows[0], progress: progress.rows, savedVisualizations: visuals.rows, savedComparisons: comparisons.rows, achievements: achievements.rows.map((row) => row.achievement_key), events: [...events.rows.map((row) => ({ id: row.id, type: "attempt", slug: row.slug, category: row.category, correct: row.correct, createdAt: Number(row.created_at) })), ...sessions.rows.map((row) => ({ id: row.id, type: "study", slug: row.slug, category: "unknown", createdAt: Number(row.created_at) }))] });
  } catch { return NextResponse.json({ error: "Account service is unavailable." }, { status: 503 }); }
}

/** Upserts a guest snapshot after sign-in or a normal background sync. */
export async function PUT(request: Request) {
  const forbidden = requireSameOrigin(request);
  if (forbidden) return forbidden;
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const snapshot = await readJson<AccountSnapshot>(request);
    if (!isValidSnapshot(snapshot)) return NextResponse.json({ error: "Invalid or oversized synchronization payload." }, { status: 400 });
    const db = getDb();
    const client = await db.connect();
    try {
      await client.query("begin");
      if (snapshot.settings) await client.query("update users set settings = settings || $1::jsonb, updated_at = now() where id = $2", [JSON.stringify(snapshot.settings), user.id]);
      if (snapshot.learner) await client.query("update users set xp = greatest(xp, $1), streak = greatest(streak, $2), gamification_enabled = $3, updated_at = now() where id = $4", [snapshot.learner.xp ?? 0, snapshot.learner.streak ?? 0, snapshot.learner.gamification ?? true, user.id]);
      for (const key of snapshot.learner?.achievements ?? []) await client.query("insert into achievements (user_id, achievement_key) values ($1, $2) on conflict do nothing", [user.id, key]);
      for (const event of snapshot.events ?? []) {
        if (event.type === "attempt") {
          const inserted = await client.query("insert into quiz_attempts (user_id, algorithm_slug, question_index, correct, client_event_id, created_at) values ($1, $2, 0, $3, $4, to_timestamp($5 / 1000.0)) on conflict (user_id, client_event_id) where client_event_id is not null do nothing returning id", [user.id, event.slug, event.correct ?? false, event.id, event.createdAt]);
          if (inserted.rowCount) await client.query(
            `insert into user_progress (user_id, algorithm_slug, category_id, attempts, correct, mistakes, mastery, last_seen_at)
             values ($1, $2, $3, 1, $4, $5, $6, to_timestamp($7 / 1000.0))
             on conflict (user_id, algorithm_slug) do update set
               attempts = user_progress.attempts + 1, correct = user_progress.correct + excluded.correct,
               mistakes = user_progress.mistakes + excluded.mistakes,
               mastery = case when user_progress.attempts + 1 = 0 then 0 else (user_progress.correct + excluded.correct)::numeric / (user_progress.attempts + 1) * 100 end,
               last_seen_at = greatest(user_progress.last_seen_at, excluded.last_seen_at), updated_at = now()`,
            [user.id, event.slug, event.category || "unknown", event.correct ? 1 : 0, event.correct ? 0 : 1, event.correct ? 100 : 0, event.createdAt],
          );
        }
        else await client.query("insert into study_sessions (user_id, algorithm_slug, duration_seconds, client_event_id, created_at) values ($1, $2, 0, $3, to_timestamp($4 / 1000.0)) on conflict (user_id, client_event_id) where client_event_id is not null do nothing", [user.id, event.slug, event.id, event.createdAt]);
      }
      for (const record of snapshot.progress ?? []) {
        await client.query(
          `insert into user_progress (user_id, algorithm_slug, category_id, attempts, correct, mistakes, mastery, last_seen_at)
           values ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8 / 1000.0))
           on conflict (user_id, algorithm_slug) do update set
             attempts = greatest(user_progress.attempts, excluded.attempts),
             correct = greatest(user_progress.correct, excluded.correct),
             mistakes = greatest(user_progress.mistakes, excluded.mistakes),
             mastery = greatest(user_progress.mastery, excluded.mastery),
             last_seen_at = greatest(user_progress.last_seen_at, excluded.last_seen_at), updated_at = now()`,
          [user.id, record.algorithmSlug, record.categoryId, record.attempts, record.correct, record.mistakes ?? 0, record.attempts ? record.correct / record.attempts * 100 : 0, record.lastSeen ?? Date.now()],
        );
      }
      for (const saved of snapshot.savedVisualizations ?? []) {
        await client.query("insert into saved_visualizations (user_id, slug, label, payload) values ($1, $2, $3, $4) on conflict (user_id, slug, label) do update set payload = excluded.payload, updated_at = now()", [user.id, saved.slug, saved.label ?? "default", JSON.stringify(saved.payload)]);
      }
      for (const saved of snapshot.savedComparisons ?? []) await client.query("insert into saved_comparisons (user_id, client_key, label, payload) values ($1, $2, $3, $4) on conflict (user_id, client_key) where client_key is not null do update set label = excluded.label, payload = excluded.payload, updated_at = now()", [user.id, saved.key, saved.label ?? null, JSON.stringify(saved.payload)]);
      await client.query("commit");
      return NextResponse.json({ ok: true });
    } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
  } catch { return NextResponse.json({ error: "Account service is unavailable." }, { status: 503 }); }
}
