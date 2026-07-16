import { NextResponse } from "next/server";
import { createToken, hashPassword, hashToken, validatePassword } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { sendPasswordResetEmail, SUPPORT_EMAIL } from "@/lib/server/mail";
import { allowRateLimit } from "@/lib/server/rate-limit";
import { clientIp, readJson, requireSameOrigin } from "@/lib/server/request";

export async function POST(request: Request) {
  const forbidden = requireSameOrigin(request);
  if (forbidden) return forbidden;
  const ip = clientIp(request);
  if (!allowRateLimit(`reset:${ip}`, 5)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const body = await readJson<{ email?: string }>(request);
  const email = body?.email?.trim().toLowerCase();
  // Always return the same response to avoid account enumeration.
  const response = { ok: true, message: `If an account exists, recovery instructions will be sent. Contact ${SUPPORT_EMAIL} if you need help.` };
  if (!email) return NextResponse.json(response);
  try {
    const user = await getDb().query<{ id: string }>("select id from users where email = $1", [email]);
    if (!user.rows[0]) return NextResponse.json(response);
    const token = createToken();
    await getDb().query("delete from password_reset_tokens where user_id = $1 or expires_at < now()", [user.rows[0].id]);
    await getDb().query("insert into password_reset_tokens (user_id, token_hash, expires_at) values ($1, $2, now() + interval '1 hour')", [user.rows[0].id, token.hash]);
    await sendPasswordResetEmail(email, token.value);
  } catch { /* keep generic response */ }
  return NextResponse.json(response);
}

export async function PUT(request: Request) {
  const forbidden = requireSameOrigin(request);
  if (forbidden) return forbidden;
  const body = await readJson<{ token?: string; password?: string }>(request);
  if (!body?.token || !validatePassword(body.password ?? "")) return NextResponse.json({ error: "Use a valid reset link and a password with at least 10 characters, including a letter and number." }, { status: 400 });
  const token = body.token as string;
  const password = body.password as string;
  const db = getDb();
  const client = await db.connect();
  try {
    await client.query("begin");
    const reset = await client.query<{ user_id: string }>("select user_id from password_reset_tokens where token_hash = $1 and used_at is null and expires_at > now() for update", [hashToken(token)]);
    if (!reset.rows[0]) { await client.query("rollback"); return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 }); }
    await client.query("update users set password_hash = $1, updated_at = now() where id = $2", [await hashPassword(password), reset.rows[0].user_id]);
    await client.query("update password_reset_tokens set used_at = now() where user_id = $1", [reset.rows[0].user_id]);
    await client.query("delete from sessions where user_id = $1", [reset.rows[0].user_id]);
    await client.query("commit");
    return NextResponse.json({ ok: true });
  } catch {
    await client.query("rollback");
    return NextResponse.json({ error: "Account service is unavailable." }, { status: 503 });
  } finally { client.release(); }
}
