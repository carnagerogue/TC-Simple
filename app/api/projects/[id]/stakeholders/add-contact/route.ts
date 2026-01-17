import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDbReady } from "@/lib/db";
import { ContactCategory, StakeholderRole } from "@prisma/client";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

function normalizeCategory(value: unknown): ContactCategory {
  if (typeof value !== "string") return ContactCategory.OTHER;
  const up = value.toUpperCase();
  return (Object.values(ContactCategory) as string[]).includes(up)
    ? (up as ContactCategory)
    : ContactCategory.OTHER;
}

function normalizeRole(value: unknown): StakeholderRole | null {
  if (typeof value !== "string") return null;
  const up = value.toUpperCase();
  return (Object.values(StakeholderRole) as string[]).includes(up)
    ? (up as StakeholderRole)
    : null;
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || session?.user?.email || null;
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        firstName?: unknown;
        lastName?: unknown;
        email?: unknown;
        phone?: unknown;
        category?: unknown;
        company?: unknown;
        roleTitle?: unknown;
        role?: unknown;
      }
    | null;

  const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : null;
  const email = typeof body?.email === "string" ? body.email.trim() : null;
  const phone = typeof body?.phone === "string" ? body.phone.trim() : null;
  const company = typeof body?.company === "string" ? body.company.trim() : null;
  const roleTitle = typeof body?.roleTitle === "string" ? body.roleTitle.trim() : null;
  const role = normalizeRole(body?.role);

  if (!firstName || !role) {
    return NextResponse.json({ error: "firstName and role are required" }, { status: 400 });
  }

  await ensureDbReady();

  const project = await db.project.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let contact = email
    ? await db.contact.findFirst({ where: { userId, email } })
    : null;

  if (!contact) {
    contact = await db.contact.create({
      data: {
        userId,
        firstName,
        lastName,
        email,
        phone,
        category: normalizeCategory(body?.category),
        company,
        role: roleTitle,
        source: "internal",
      },
    });
  }

  const existing = await db.projectContact.findFirst({
    where: { projectId: project.id, contactId: contact.id, role },
    select: { id: true },
  });

  if (!existing) {
    await db.projectContact.create({
      data: {
        projectId: project.id,
        contactId: contact.id,
        role,
      },
    });
  }

  return NextResponse.json({ ok: true, contactId: contact.id });
}
