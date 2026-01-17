import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDbReady } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

async function getUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || session?.user?.email || null;
  return { session, userId };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { session, userId } = await getUserId();
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDbReady();

  const project = await db.project.findFirst({
    where: { id: params.id, userId },
    include: { tasks: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: project.id,
    name: project.name,
    status: project.status,
    isPrimary: project.isPrimary,
    summary: project.summary,
    myClientRole: project.myClientRole,
    tasks: project.tasks,
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { session, userId } = await getUserId();
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDbReady();

  const existing = await db.project.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  await db.project.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
