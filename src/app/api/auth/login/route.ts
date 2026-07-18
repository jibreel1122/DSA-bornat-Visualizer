import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { allowRateLimit } from "@/lib/server/rate-limit";
import { clientIp, readJson, requireSameOrigin } from "@/lib/server/request";

export async function POST(request: Request) {
  const forbidden = requireSameOrigin(request);
  if (forbidden) return forbidden;
  const ip = clientIp(request);
  if (!allowRateLimit(`login:${ip}`, 10)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const body = await readJson<{ email?: string; password?: string }>(request);
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password ?? "";
  if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  try {
    const result = await getDb().query<{ id: string; email: string; role: "user" | "owner"; password_hash: string }>("select id, email, role, password_hash from users where email = $1", [email]);
    const user = result.rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    await createSession(user.id);
    return NextResponse.json({ user: { email: user.email, role: user.role } });
  } catch {
    return NextResponse.json({ error: "Account service is unavailable." }, { status: 503 });
  }
}
