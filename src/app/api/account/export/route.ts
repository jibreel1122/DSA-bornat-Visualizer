import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const db = getDb();
    const [profile, progress, quizzes, sessions, achievements, visualizations, comparisons] = await Promise.all([
      db.query("select email, settings, xp, level, streak, gamification_enabled, created_at from users where id = $1", [user.id]),
      db.query("select * from user_progress where user_id = $1", [user.id]),
      db.query("select * from quiz_attempts where user_id = $1", [user.id]),
      db.query("select * from study_sessions where user_id = $1", [user.id]),
      db.query("select * from achievements where user_id = $1", [user.id]),
      db.query("select slug, label, payload, updated_at from saved_visualizations where user_id = $1", [user.id]),
      db.query("select label, payload, updated_at from saved_comparisons where user_id = $1", [user.id]),
    ]);
    return NextResponse.json({ exportedAt: new Date().toISOString(), profile: profile.rows[0], progress: progress.rows, quizHistory: quizzes.rows, studyTime: sessions.rows, achievements: achievements.rows, savedVisualizations: visualizations.rows, savedComparisons: comparisons.rows }, { headers: { "Content-Disposition": "attachment; filename=bornat-visualizer-data.json" } });
  } catch { return NextResponse.json({ error: "Account service is unavailable." }, { status: 503 }); }
}

