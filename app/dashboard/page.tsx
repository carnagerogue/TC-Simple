import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProjectsBoard } from "@/components/dashboard/ProjectsBoard";
import { PriorityTasksPanel } from "@/components/dashboard/PriorityTasksPanel";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const userId = session.user.id || session.user.email || null;
  if (!userId) {
    redirect("/login");
  }

  const dbTransactions = await db.transaction.findMany({
    where: {
      userId,
    },
    include: { tasks: true },
    orderBy: { createdAt: "desc" },
  });

  const transactions = dbTransactions.map((txn) => ({
    id: txn.id,
    name: txn.address,
    stage: (txn.stage as "Intake" | "Under Contract" | "Closing") || "Intake",
    progress: txn.progress,
    agent: "Unknown Agent",
    client: txn.buyerName || txn.sellerName || "Unknown Client",
    deadlines: txn.tasks
      .filter((t) => t.dueDate)
      .slice(0, 3)
      .map((t) => ({
        label: t.title,
        date: t.dueDate
          ? t.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "",
      })),
  }));

  const primaryTxn = dbTransactions[0];

  const primaryDeadlines = primaryTxn
    ? primaryTxn.tasks
        .filter((t) => t.dueDate)
        .map((t) => ({
          id: t.id,
          milestone: t.title,
          property: primaryTxn.address,
          date: t.dueDate!.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          status: (t.status as "upcoming" | "overdue" | "completed") || "upcoming",
        }))
    : [];

  const primaryProjects = await db.project.findMany({
    where: { userId, isPrimary: true },
    include: { tasks: true },
    orderBy: { updatedAt: "desc" },
  });

  const activeProjects = await db.project.findMany({
    where: { userId, status: { not: "completed" }, isPrimary: false },
    include: { tasks: true },
    orderBy: { updatedAt: "desc" },
  });

  const completedProjects = await db.project.findMany({
    where: { userId, status: "completed" },
    include: { tasks: true },
    orderBy: { updatedAt: "desc" },
  });

  const priorityTasks = await db.projectTask.findMany({
    where: {
      priority: true,
      project: {
        is: {
          userId,
        },
      },
    },
    include: { project: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="flex w-full flex-col gap-6 px-6 pb-10">
        <div className="flex items-center justify-between rounded-3xl border border-slate-200/60 bg-white/80 px-6 py-5 shadow-sm backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Dashboard</p>
            <h1 className="text-3xl font-semibold">Good morning, {session?.user?.name || "there"}</h1>
            <p className="text-sm text-slate-500">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <Link
            href="/upload"
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
          >
            Start new document
          </Link>
        </div>

        {priorityTasks.length > 0 ? (
          <PriorityTasksPanel
            tasks={priorityTasks.map((t) => ({
              id: t.id,
              title: t.title,
              status: t.status,
              dueDate: t.dueDate ? t.dueDate.toISOString() : null,
              tags: t.tags || "",
              notes: t.notes || "",
              projectId: t.projectId,
              projectName: t.project.name,
              priority: t.priority ?? true,
            }))}
          />
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Live transactions</p>
            <h3 className="text-2xl font-semibold mt-1">{transactions.length}</h3>
            <p className="text-sm text-slate-500">Active intake files</p>
          </div>
          <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active projects</p>
            <h3 className="text-2xl font-semibold mt-1">{activeProjects.length}</h3>
            <p className="text-sm text-slate-500">In progress task boards</p>
          </div>
          <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Upcoming deadlines</p>
            <h3 className="text-2xl font-semibold mt-1">{primaryDeadlines.length}</h3>
            <p className="text-sm text-slate-500">Near-term milestone dates</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Deadlines</p>
              <h2 className="text-lg font-semibold">Near-term dates</h2>
            </div>
            <span className="text-xs text-slate-500">
              {primaryDeadlines.length} due
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {primaryDeadlines.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm shadow-sm"
              >
                <div>
                  <p className="font-semibold">{d.milestone}</p>
                  <p className="text-xs text-slate-500">
                    {d.property} · {d.date}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {d.status}
                </span>
              </div>
            ))}
            {primaryDeadlines.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                No upcoming deadlines.
              </div>
            ) : null}
          </div>
        </div>

        <ProjectsBoard
          primary={primaryProjects.map((p) => ({
            id: p.id,
            name: p.name,
            updatedAt: p.updatedAt.toISOString(),
            status: p.status,
            isPrimary: p.isPrimary,
            tasks: p.tasks.map((t) => ({ status: t.status })),
          }))}
          active={activeProjects.map((p) => ({
            id: p.id,
            name: p.name,
            updatedAt: p.updatedAt.toISOString(),
            status: p.status,
            isPrimary: p.isPrimary,
            tasks: p.tasks.map((t) => ({ status: t.status })),
          }))}
          completed={completedProjects.map((p) => ({
            id: p.id,
            name: p.name,
            updatedAt: p.updatedAt.toISOString(),
            status: p.status,
            isPrimary: p.isPrimary,
            tasks: p.tasks.map((t) => ({ status: t.status })),
          }))}
        />
    </div>
  );
}
