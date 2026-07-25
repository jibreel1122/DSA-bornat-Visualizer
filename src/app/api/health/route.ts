import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** Lightweight readiness probe that verifies the production database is reachable. */
export async function GET() {
  try {
    await getDb().query("select 1");
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
