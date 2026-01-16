import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type SessionUser = { id?: string; email?: string | null };

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  const userId = user?.id || user?.email || null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await db.template.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });

  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  const userId = user?.id || user?.email || null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as unknown;
  const payload = isRecord(body) ? body : {};
  const name = payload.name;
  const tasks = payload.tasks;
  const items = payload.items;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const rawItems = Array.isArray(items) ? items : Array.isArray(tasks) ? tasks : [];

  const normalizedItems = rawItems
    .map((item) => (isRecord(item) ? item : null))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) => ({
      title: typeof item.title === "string" ? item.title : "",
      status: typeof item.status === "string" ? item.status : "upcoming",
      dueOffsetDays:
        typeof item.dueOffsetDays === "number" && Number.isFinite(item.dueOffsetDays)
          ? Math.trunc(item.dueOffsetDays)
          : null,
    }))
    .filter((item) => item.title.trim().length > 0);

  if (normalizedItems.length === 0) {
    return NextResponse.json({ error: "items are required" }, { status: 400 });
  }

  const template = await db.template.create({
    data: {
      userId,
      name: name.trim(),
      items: {
        create: normalizedItems,
      },
    },
    select: { id: true, name: true },
  });

  return NextResponse.json(template);
}