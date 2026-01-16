import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id || session.user.email;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await db.projectTask.findMany({
    where: {
      project: {
        userId,
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

