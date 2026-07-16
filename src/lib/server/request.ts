import { NextResponse } from "next/server";

const JSON_LIMIT = 256_000;

/** Reject cross-origin browser mutations while allowing non-browser deployment tooling. */
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  // Nginx terminates TLS before forwarding to the localhost-only Next server.
  // It overwrites these headers, so browser requests are compared to their public HTTPS origin.
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || url.protocol.replace(":", "");
  const host = request.headers.get("host") || url.host;
  if (origin && origin !== `${protocol}://${host}`) {
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
