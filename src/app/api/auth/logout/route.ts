import { NextResponse } from "next/server";
import { destroySession } from "@/lib/server/auth";
import { requireSameOrigin } from "@/lib/server/request";

export async function POST(request: Request) {
  const forbidden = requireSameOrigin(request);
  if (forbidden) return forbidden;
  try { await destroySession(); } catch { /* a stale database session still clears the browser cookie */ }
  return NextResponse.json({ ok: true });
}
