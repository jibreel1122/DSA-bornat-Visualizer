import { NextResponse } from "next/server";
import { createSession, hashPassword, validatePassword } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { allowRateLimit } from "@/lib/server/rate-limit";
import { clientIp, readJson, requireSameOrigin } from "@/lib/server/request";

export async function POST(request: Request) {
  const forbidden = requireSameOrigin(request);
  if (forbidden) return forbidden;
  const ip = clientIp(request);
  if (!allowRateLimit(`register:${ip}`, 5)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const body = await readJson<{ email?: string; password?: string }>(request);
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password ?? "";
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!validatePassword(password)) return NextResponse.json({ error: "Use at least 10 characters including a letter and number." }, { status: 400 });
  try {
    const result = await getDb().query<{ id: string }>("insert into users (email, password_hash) values ($1, $2) returning id", [email, await hashPassword(password)]);
    await createSession(result.rows[0].id);
    return NextResponse.json({ user: { email, role: "user" as const } }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
    return NextResponse.json({ error: "Account service is unavailable." }, { status: 503 });
  }
}
