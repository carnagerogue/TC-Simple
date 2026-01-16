import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildTasksFromItems } from "@/lib/projectTaskTemplates";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type SessionUser = { id?: string; email?: string | null };

function coerceStringOrStringArray(value: unknown): string | string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v));
  }
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as unknown;
  const payload = isRecord(body) ? body : {};
  const name = payload.name;
  const items = payload.items;
  const providedTasks = payload.tasks;
  const transactionId = payload.transactionId;
  const documentId = payload.documentId;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const user = session.user as SessionUser;
  const userId = user.id || user.email;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Normalize items to record summary
  const summary: Record<string, string | string[]> = {};
  const normalizedItems: Array<{ field: string; value: string | string[] }> = [];

  if (Array.isArray(items)) {
    items.forEach((item) => {
      if (!isRecord(item)) return;
      const field = item.field;
      if (typeof field !== "string" || !field) return;
      const value = coerceStringOrStringArray(item.value);
      normalizedItems.push({ field, value });
      summary[field] = value;
    });
  }
  if (typeof transactionId === "string" && transactionId.trim()) {
    summary["transactionId"] = transactionId;
  }
  if (typeof documentId === "string" && documentId.trim()) {
    summary["documentId"] = documentId;
  }

  const project = await db.project.create({
    data: {
      name: name.trim(),
      userId,
      summary,
    },
  });

  let tasksToCreate: {
    title: string;
    status: string;
    dueDate: Date | null;
    tags: string | null;
    projectId: string;
  }[] = [];

  if (Array.isArray(providedTasks) && providedTasks.length > 0) {
    tasksToCreate = providedTasks
      .map((t) => (isRecord(t) ? t : null))
      .filter((t): t is Record<string, unknown> => t !== null)
      .map((t) => {
        const title = typeof t.title === "string" ? t.title : "";
        const status = typeof t.status === "string" ? t.status : "upcoming";
        const tags = typeof t.tags === "string" ? t.tags : null;
        const dueDateRaw = t.dueDate;
        const dueDate =
          typeof dueDateRaw === "string" || typeof dueDateRaw === "number"
            ? new Date(dueDateRaw)
            : dueDateRaw instanceof Date
            ? dueDateRaw
            : null;
        const safeDueDate = dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null;
        return {
          title,
          status,
          dueDate: safeDueDate,
          tags,
          projectId: project.id,
        };
      })
      .filter((t) => t.title.trim().length > 0);
  } else if (normalizedItems.length > 0) {
    tasksToCreate = buildTasksFromItems(
      normalizedItems.map((item) => ({
        field: item.field,
        value: item.value,
      }))
    ).map((t) => ({
      title: t.title,
      status: "upcoming",
      dueDate: t.dueDate ?? null,
      tags: null,
      projectId: project.id,
    }));
  }

  if (tasksToCreate.length > 0) {
    await db.projectTask.createMany({
      data: tasksToCreate,
    });
  }

  return NextResponse.json({ projectId: project.id });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user.id || user.email;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await db.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(
    projects.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      isPrimary: p.isPrimary,
      updatedAt: p.updatedAt,
    }))
  );
}