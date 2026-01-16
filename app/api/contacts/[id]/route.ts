import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

const VALID_CATEGORIES = ["AGENT", "CLIENT", "ESCROW", "VENDOR", "LENDER", "TITLE", "OTHER"] as const;
type Category = (typeof VALID_CATEGORIES)[number];

type ContactPayload = {
  firstName?: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  category?: Category;
  company?: string | null;
  role?: string | null;
  notes?: string | null;
  source?: string | null;
  avatarUrl?: string | null;
  lastInteraction?: string | null;
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;
  const contact = await db.contact.findFirst({ where: { id: params.id, userId } });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ contact });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;
  const body = (await req.json()) as ContactPayload;

  if (body.category && !VALID_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  try {
    const existing = await db.contact.findFirst({ where: { id: params.id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await db.contact.update({
      where: { id: params.id },
      data: {
        ...("firstName" in body ? { firstName: body.firstName || "" } : {}),
        ...("lastName" in body ? { lastName: body.lastName || null } : {}),
        ...("email" in body ? { email: body.email || null } : {}),
        ...("phone" in body ? { phone: body.phone || null } : {}),
        ...("category" in body ? { category: body.category } : {}),
        ...("company" in body ? { company: body.company || null } : {}),
        ...("role" in body ? { role: body.role || null } : {}),
        ...("notes" in body ? { notes: body.notes || null } : {}),
        ...("source" in body ? { source: body.source || "internal" } : {}),
        ...("avatarUrl" in body ? { avatarUrl: body.avatarUrl || null } : {}),
        ...(body.lastInteraction !== undefined
          ? { lastInteraction: body.lastInteraction ? new Date(body.lastInteraction) : null }
          : {}),
      },
    });
    return NextResponse.json({ contact: updated });
  } catch (e: any) {
    if (e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Unable to update contact", detail: e?.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;
  try {
    const existing = await db.contact.findFirst({ where: { id: params.id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await db.contact.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Unable to delete contact", detail: e?.message }, { status: 500 });
  }
}
