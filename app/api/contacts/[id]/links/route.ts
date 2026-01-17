import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDbReady } from "@/lib/db";
import { StakeholderRole } from "@prisma/client";

type Params = { params: { id: string } };

function normalizeRole(value: unknown): StakeholderRole {
  if (typeof value !== "string") return StakeholderRole.OTHER;
  const role = value.toUpperCase();
  return (Object.values(StakeholderRole) as string[]).includes(role)
    ? (role as StakeholderRole)
    : StakeholderRole.OTHER;
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

  const contact = await db.contact.findFirst({
    where: { id: params.id, userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      category: true,
      company: true,
      role: true,
      avatarUrl: true,
    },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const projectLinks = await db.projectContact.findMany({
    where: { contactId: contact.id, project: { userId } },
    include: { project: true },
    orderBy: { createdAt: "desc" },
  });

  const transactionLinks = await db.transactionContact.findMany({
    where: { contactId: contact.id, transaction: { userId } },
    include: { transaction: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    contact,
    projects: projectLinks.map((link) => ({
      id: link.project.id,
      name: link.project.name,
      status: link.project.status,
      updatedAt: link.project.updatedAt.toISOString(),
      role: link.role,
      isPrimary: link.isPrimary,
    })),
    transactions: transactionLinks.map((link) => ({
      id: link.transaction.id,
      name: link.transaction.address,
      status: link.transaction.stage,
      updatedAt: link.transaction.updatedAt.toISOString(),
      role: link.role,
      isPrimary: link.isPrimary,
    })),
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { session, userId } = await getUser();
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        type?: unknown;
        projectId?: unknown;
        transactionId?: unknown;
        name?: unknown;
        address?: unknown;
        role?: unknown;
        isPrimary?: unknown;
      }
    | null;

  const type = typeof payload?.type === "string" ? payload.type : null;
  const role = normalizeRole(payload?.role);
  const isPrimary = payload?.isPrimary === true;

  if (!type || (type !== "project" && type !== "transaction")) {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }

  await ensureDbReady();

  const contact = await db.contact.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  if (type === "project") {
    const projectId = typeof payload?.projectId === "string" ? payload.projectId : null;
    const name = typeof payload?.name === "string" ? payload.name.trim() : "";

    let project = projectId
      ? await db.project.findFirst({ where: { id: projectId, userId }, select: { id: true } })
      : null;

    if (!project && name) {
      project = await db.project.create({
        data: {
          name,
          userId,
          summary: { contactId: contact.id },
        },
        select: { id: true },
      });
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found or name is missing" }, { status: 400 });
    }

    const existing = await db.projectContact.findFirst({
      where: { projectId: project.id, contactId: contact.id, role },
      select: { id: true },
    });

    if (!existing) {
      await db.projectContact.create({
        data: { projectId: project.id, contactId: contact.id, role, isPrimary },
      });
    }

    return NextResponse.json({ ok: true, projectId: project.id });
  }

  const transactionId = typeof payload?.transactionId === "string" ? payload.transactionId : null;
  const address = typeof payload?.address === "string" ? payload.address.trim() : "";

  let transaction = transactionId
    ? await db.transaction.findFirst({ where: { id: transactionId, userId }, select: { id: true } })
    : null;

  if (!transaction && address) {
    transaction = await db.transaction.create({
      data: {
        address,
        stage: "Intake",
        userId,
      },
      select: { id: true },
    });
  }

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found or address is missing" }, { status: 400 });
  }

  const existing = await db.transactionContact.findFirst({
    where: { transactionId: transaction.id, contactId: contact.id, role },
    select: { id: true },
  });

  if (!existing) {
    await db.transactionContact.create({
      data: { transactionId: transaction.id, contactId: contact.id, role, isPrimary },
    });
  }

  return NextResponse.json({ ok: true, transactionId: transaction.id });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { session, userId } = await getUser();
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { type?: unknown; projectId?: unknown; transactionId?: unknown; role?: unknown }
    | null;

  const type = typeof payload?.type === "string" ? payload.type : null;
  const role = normalizeRole(payload?.role);

  if (!type || (type !== "project" && type !== "transaction")) {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }

  await ensureDbReady();

  const contact = await db.contact.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  if (type === "project") {
    const projectId = typeof payload?.projectId === "string" ? payload.projectId : null;
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }
    const result = await db.projectContact.deleteMany({
      where: { projectId, contactId: contact.id, role, project: { userId } },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  const transactionId = typeof payload?.transactionId === "string" ? payload.transactionId : null;
  if (!transactionId) {
    return NextResponse.json({ error: "transactionId is required" }, { status: 400 });
  }
  const result = await db.transactionContact.deleteMany({
    where: { transactionId, contactId: contact.id, role, transaction: { userId } },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
