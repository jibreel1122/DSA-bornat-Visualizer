import { NextResponse } from "next/server";
import { currentUser, destroySession } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { requireSameOrigin } from "@/lib/server/request";

async function requireUser() {
  const user = await currentUser();
  return user;
}

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    return NextResponse.json({ user: { email: user.email, role: user.role, createdAt: user.created_at } });
  } catch { return NextResponse.json({ accountsEnabled: false }, { status: 200 }); }
}

/** Permanently deletes the signed-in account and every synchronized record. */
export async function DELETE(request: Request) {
  const forbidden = requireSameOrigin(request);
  if (forbidden) return forbidden;
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    await getDb().query("delete from users where id = $1", [user.id]);
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Account service is unavailable." }, { status: 503 }); }
}
