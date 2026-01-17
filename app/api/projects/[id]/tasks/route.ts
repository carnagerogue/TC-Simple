import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDbReady } from "@/lib/db";

type Params = { params: { id: string } };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id || session.user.email || null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDbReady();

  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
    dueDate?: unknown;
    status?: unknown;
  } | null;

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const project = await db.project.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const dueDate =
    typeof body?.dueDate === "string" && body.dueDate
      ? new Date(body.dueDate)
      : null;

  const task = await db.projectTask.create({
    data: {
      projectId: project.id,
      title,
      status: typeof body?.status === "string" ? body.status : "upcoming",
      dueDate: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null,
    },
  });

  return NextResponse.json({
    id: task.id,
    title: task.title,
    dueDate: task.dueDate?.toISOString() ?? null,
    status: task.status,
    tags: task.tags,
    notes: task.notes,
    priority: task.priority,
  });
}
