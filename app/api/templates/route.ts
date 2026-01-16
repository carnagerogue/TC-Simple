import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await db.template.findMany({
    where: { userId: session.user.id || session.user.email! },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as unknown;
  const payload = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const name = payload.name;
  const items = payload.items;

  if (typeof name !== "string" || !name.trim() || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Name and items are required" }, { status: 400 });
  }

  const normalizedItems = items
    .map((item) => (typeof item === "object" && item !== null ? (item as Record<string, unknown>) : null))
    .filter(Boolean)
    .map((item) => ({
      title: typeof item.title === "string" ? item.title : "",
      status: typeof item.status === "string" ? item.status : "upcoming",
      dueOffsetDays:
        typeof item.dueOffsetDays === "number" && Number.isFinite(item.dueOffsetDays) ? item.dueOffsetDays : null,
    }))
    .filter((item) => item.title.trim().length > 0);

  if (normalizedItems.length === 0) {
    return NextResponse.json({ error: "Name and items are required" }, { status: 400 });
  }

  const template = await db.template.create({
    data: {
      userId: session.user.id || session.user.email!,
      name: name.trim(),
      items: {
        create: normalizedItems,
      },
    },
    include: { items: true },
  });

  return NextResponse.json(template);
}

