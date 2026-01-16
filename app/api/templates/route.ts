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

  const body = await request.json();
  const { name, items } = body ?? {};

  if (!name || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Name and items are required" }, { status: 400 });
  }

  const template = await db.template.create({
    data: {
      userId: session.user.id || session.user.email!,
      name,
      items: {
        create: items.map((item: any) => ({
          title: item.title,
          status: item.status ?? "upcoming",
          dueOffsetDays: item.dueOffsetDays ?? null,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(template);
}

