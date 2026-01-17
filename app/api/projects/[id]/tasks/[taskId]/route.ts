import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDbReady } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: { id: string; taskId: string } };

async function getUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || session?.user?.email || null;
  return { session, userId };
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { session, userId } = await getUserId();
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        status?: string;
        priority?: boolean;
        notes?: string | null;
        dueDate?: string | null;
        tags?: string | null;
      }
    | null;

  const update: {
    status?: string;
    priority?: boolean;
    notes?: string | null;
    dueDate?: Date | null;
    tags?: string | null;
  } = {};

  if (typeof body?.status === "string") update.status = body.status;
  if (typeof body?.priority === "boolean") update.priority = body.priority;
  if (typeof body?.notes === "string" || body?.notes === null) update.notes = body.notes ?? null;
  if (typeof body?.tags === "string" || body?.tags === null) update.tags = body.tags ?? null;
  if (body?.dueDate === null) update.dueDate = null;
  if (typeof body?.dueDate === "string" && body.dueDate) {
    const parsed = new Date(body.dueDate);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Invalid dueDate" }, { status: 400 });
    }
    update.dueDate = parsed;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  await ensureDbReady();

  const task = await db.projectTask.findFirst({
    where: {
      id: params.taskId,
      projectId: params.id,
      project: { userId },
    },
    select: { id: true },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const updated = await db.projectTask.update({
    where: { id: task.id },
    data: update,
  });

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    priority: updated.priority,
    notes: updated.notes,
    dueDate: updated.dueDate?.toISOString() ?? null,
    tags: updated.tags,
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { session, userId } = await getUserId();
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDbReady();

  const result = await db.projectTask.deleteMany({
    where: {
      id: params.taskId,
      projectId: params.id,
      project: { userId },
    },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
