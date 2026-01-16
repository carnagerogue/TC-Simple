import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Helper to check if a value is a record (object)
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as unknown;
  const payload = isRecord(body) ? body : {};
  const name = payload.name;
  const tasks = payload.tasks;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // 1. Create the Template
  const template = await db.emailTemplate.create({
    data: {
      name: name.trim(),
    },
  });

  // 2. The Fix: Replace 'any' with 'unknown' to satisfy ESLint 
  // and use a type predicate to remove the 'null' possibility.
  if (Array.isArray(tasks)) {
    const tasksToCreate = tasks
      .map((t) => (isRecord(t) ? t : null))
      .filter((item): item is Record<string, unknown> => item !== null) 
      .map((item) => ({
        title: typeof item.title === "string" ? item.title : "",
        status: typeof item.status === "string" ? item.status : "upcoming",
        dueOffsetDays:
          typeof item.dueOffsetDays === "number" && Number.isFinite(item.dueOffsetDays) 
            ? item.dueOffsetDays 
            : null,
        templateId: template.id,
      }))
      .filter((t) => t.title.trim().length > 0);

    if (tasksToCreate.length > 0) {
      await db.templateTask.createMany({
        data: tasksToCreate,
      });
    }
  }

  return NextResponse.json({ id: template.id });
}