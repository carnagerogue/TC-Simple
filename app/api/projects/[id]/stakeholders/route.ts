import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDbReady } from "@/lib/db";
import { StakeholderRole } from "@prisma/client";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

function normalizeRole(value: unknown): StakeholderRole | null {
  if (typeof value !== "string") return null;
  const role = value.toUpperCase();
  return (Object.values(StakeholderRole) as string[]).includes(role)
    ? (role as StakeholderRole)
    : null;
}

async function getUser() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || session?.user?.email || null;
  return { session, userId };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { session, userId } = await getUser();
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDbReady();

  const project = await db.project.findFirst({
    where: { id: params.id, userId },
    select: { id: true, myClientRole: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const links = await db.projectContact.findMany({
    where: { projectId: project.id },
    include: { contact: true },
    orderBy: { createdAt: "asc" },
  });

  const totals = await db.projectContact.groupBy({
    by: ["contactId"],
    where: { project: { userId } },
    _count: { contactId: true },
  });

  const totalMap = new Map(totals.map((t) => [t.contactId, t._count.contactId]));

  return NextResponse.json({
    stakeholders: links.map((link) => ({
      id: link.id,
      role: link.role,
      totalTransactions: totalMap.get(link.contactId) ?? 1,
      contact: {
        id: link.contact.id,
        firstName: link.contact.firstName,
        lastName: link.contact.lastName,
        email: link.contact.email,
        phone: link.contact.phone,
        category: link.contact.category,
        company: link.contact.company,
        role: link.contact.role,
        source: link.contact.source,
        avatarUrl: link.contact.avatarUrl,
      },
    })),
    myClientRole: project.myClientRole ?? null,
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { session, userId } = await getUser();
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { contactId?: unknown; role?: unknown } | null;
  const contactId = typeof body?.contactId === "string" ? body?.contactId : null;
  const role = normalizeRole(body?.role);
  if (!contactId || !role) {
    return NextResponse.json({ error: "contactId and role are required" }, { status: 400 });
  }

  await ensureDbReady();

  const project = await db.project.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const contact = await db.contact.findFirst({
    where: { id: contactId, userId },
    select: { id: true },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const existing = await db.projectContact.findFirst({
    where: { projectId: project.id, contactId, role },
    select: { id: true },
  });

  if (!existing) {
    await db.projectContact.create({
      data: { projectId: project.id, contactId, role },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { session, userId } = await getUser();
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { contactId?: unknown; role?: unknown } | null;
  const contactId = typeof body?.contactId === "string" ? body?.contactId : null;
  const role = normalizeRole(body?.role);
  if (!contactId || !role) {
    return NextResponse.json({ error: "contactId and role are required" }, { status: 400 });
  }

  await ensureDbReady();

  const result = await db.projectContact.deleteMany({
    where: {
      projectId: params.id,
      contactId,
      role,
      project: { userId },
    },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Stakeholder not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
