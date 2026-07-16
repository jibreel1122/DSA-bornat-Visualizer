import { NextResponse } from "next/server";

const JSON_LIMIT = 256_000;

/** Reject cross-origin browser mutations while allowing non-browser deployment tooling. */
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }
  return null;
}

export async function readJson<T>(request: Request): Promise<T | null> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(length) || length > JSON_LIMIT) return null;
  try {
    const body = await request.text();
    if (body.length > JSON_LIMIT) return null;
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

export function clientIp(request: Request) {
  // The reverse proxy must overwrite this header instead of appending untrusted values.
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}
