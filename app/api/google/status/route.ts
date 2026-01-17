import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDbReady } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id || session.user.email || null;
  if (!userId) {
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  }

  await ensureDbReady();

  const token = await db.userToken.findFirst({ where: { userId, provider: "google" } });

  if (!token) {
    return NextResponse.json({ status: "missing" });
  }

  const expired = token.expiresAt ? token.expiresAt.getTime() < Date.now() - 60_000 : true;

  return NextResponse.json({ status: expired ? "expired" : "ok", expiresAt: token.expiresAt });
}

