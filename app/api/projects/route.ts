import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildTasksFromItems } from "@/lib/projectTaskTemplates";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, items, tasks: providedTasks, transactionId, documentId } = body ?? {};

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const userId = (session.user as any).id || session.user.email!;

  // Normalize items to record summary
  const summary: Record<string, any> = {};
  if (Array.isArray(items)) {
    items.forEach((item: any) => {
      if (item?.field) {
        summary[item.field] = item.value;
      }
    });
  }
  if (typeof transactionId === "string" && transactionId) {
    summary["transactionId"] = transactionId;
  }
  if (typeof documentId === "string" && documentId) {
    summary["documentId"] = documentId;
  }

  const project = await db.project.create({
    data: {
      name,
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
    tasksToCreate = providedTasks.map((t: any) => ({
      title: t.title,
      status: t.status || "upcoming",
      dueDate: t.dueDate ? new Date(t.dueDate) : null,
      tags: t.tags ?? null,
      projectId: project.id,
    }));
  } else if (Array.isArray(items) && items.length > 0) {
    tasksToCreate = buildTasksFromItems(
      items.map((item: any) => ({
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
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;

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

