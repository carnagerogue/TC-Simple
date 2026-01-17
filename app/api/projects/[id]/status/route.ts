import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDbReady } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || session?.user?.email || null;
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { status?: string; isPrimary?: boolean }
    | null;

  const status = typeof body?.status === "string" ? body.status : undefined;
  const isPrimary = typeof body?.isPrimary === "boolean" ? body.isPrimary : undefined;

  if (!status && typeof isPrimary !== "boolean") {
    return NextResponse.json({ error: "status or isPrimary is required" }, { status: 400 });
  }

  await ensureDbReady();

  const project = await db.project.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (isPrimary) {
    await db.project.updateMany({
      where: { userId, id: { not: project.id } },
      data: { isPrimary: false },
    });
  }

  const updated = await db.project.update({
    where: { id: project.id },
    data: {
      ...(status ? { status } : {}),
      ...(typeof isPrimary === "boolean" ? { isPrimary } : {}),
    },
  });

  if (status === "completed") {
    await db.projectTask.updateMany({
      where: { projectId: project.id },
      data: { status: "completed" },
    });
  }

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    isPrimary: updated.isPrimary,
  });
}
