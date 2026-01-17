import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDbReady } from "@/lib/db";
import { ProjectTasksClient } from "@/components/projects/ProjectTasksClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

export default async function ProjectTasksPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = session.user.id || session.user.email;
  if (!userId) redirect("/login");

  await ensureDbReady();

  const project = await db.project.findFirst({
    where: { id: params.id, userId },
    include: {
      tasks: {
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!project) notFound();

  const summary =
    project.summary && typeof project.summary === "object" && !Array.isArray(project.summary)
      ? (project.summary as Record<string, string | number | null | undefined>)
      : null;

  const initialProject = {
    id: project.id,
    name: project.name,
    summary,
    myClientRole: project.myClientRole ?? null,
    status: project.status,
  };

  const initialTasks = project.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    status: t.status,
    tags: t.tags ?? null,
    notes: t.notes ?? null,
    priority: t.priority ?? false,
  }));

  return (
    <ProjectTasksClient
      projectId={project.id}
      initialProject={initialProject}
      initialTasks={initialTasks}
    />
  );
}
