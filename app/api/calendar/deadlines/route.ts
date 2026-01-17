export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

type SessionUser = { id?: string; email?: string | null };

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  const userId = user?.id || user?.email || null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const days = Math.min(Math.max(Number(request.nextUrl.searchParams.get("days") ?? "60"), 1), 365);
  const maxDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const tasks = await db.projectTask.findMany({
    where: {
      project: { userId },
      dueDate: { not: null, lte: maxDate },
      status: { not: "completed" },
    },
    orderBy: { dueDate: "asc" },
    take: 500,
    include: {
      project: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    days,
    deadlines: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      status: t.status,
      project: t.project,
      tags: t.tags ?? null,
    })),
  });
}

