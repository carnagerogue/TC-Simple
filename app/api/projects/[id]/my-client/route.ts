import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDbReady } from "@/lib/db";
import { MyClientRole } from "@prisma/client";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

function normalizeRole(value: unknown): MyClientRole | null {
  if (typeof value !== "string") return null;
  const up = value.toUpperCase();
  return (Object.values(MyClientRole) as string[]).includes(up) ? (up as MyClientRole) : null;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || session?.user?.email || null;
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { role?: unknown } | null;
  const role = normalizeRole(body?.role);
  if (!role) {
    return NextResponse.json({ error: "role must be BUYER or SELLER" }, { status: 400 });
  }

  await ensureDbReady();

  const project = await db.project.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const updated = await db.project.update({
    where: { id: project.id },
    data: { myClientRole: role },
  });

  const hasStakeholder = await db.projectContact.findFirst({
    where: { projectId: project.id, role },
    select: { id: true },
  });

  return NextResponse.json({
    myClientRole: updated.myClientRole,
    hasStakeholder: Boolean(hasStakeholder),
  });
}
