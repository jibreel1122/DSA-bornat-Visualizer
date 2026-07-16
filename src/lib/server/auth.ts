import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { getDb } from "./db";

const scrypt = promisify(scryptCallback);
const COOKIE = "bdsv_session";
const SESSION_DAYS = 30;

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [salt, expected] = encoded.split(":");
  if (!salt || !expected) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(expected, "hex"), derived);
}

export function validatePassword(password: string) {
  return password.length >= 10 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await getDb().query(
    "insert into sessions (user_id, token_hash, expires_at) values ($1, $2, $3)",
    [userId, digest(token), expiresAt],
  );
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await getDb().query("delete from sessions where token_hash = $1", [digest(token)]);
  jar.delete(COOKIE);
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const result = await getDb().query<{ id: string; email: string; created_at: Date }>(
    `select users.id, users.email, users.created_at from sessions
     join users on users.id = sessions.user_id
     where sessions.token_hash = $1 and sessions.expires_at > now()`,
    [digest(token)],
  );
  return result.rows[0] ?? null;
}

export function createToken() {
  const value = randomBytes(32).toString("base64url");
  return { value, hash: digest(value) };
}

export function hashToken(value: string) {
  return digest(value);
}

