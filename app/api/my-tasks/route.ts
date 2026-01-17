import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDbReady } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userIds = Array.from(
    new Set([session.user.id, session.user.email].filter((v): v is string => typeof v === "string" && v.length > 0))
  );
  if (userIds.length === 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDbReady();

  const tasks = await db.projectTask.findMany({
    where: {
      project: {
        userId: { in: userIds },
        status: { not: "completed" },
      },
      status: { not: "completed" },
    },
    include: {
      project: {
        select: { id: true, name: true, status: true },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json({
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate,
      status: t.status,
      tags: t.tags || null,
      projectId: t.projectId,
      projectName: t.project.name,
    })),
  });
}

