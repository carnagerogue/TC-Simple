"use client";

import { useState } from "react";
import Link from "next/link";
import { TaskDetailModal } from "@/components/projects/TaskDetailModal";

type PriorityTask = {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  tags?: string | null;
  notes?: string | null;
  projectId: string;
  projectName: string;
  priority?: boolean;
};

type Props = {
  tasks: PriorityTask[];
};

type TaskPatchPayload = {
  status?: string;
  priority?: boolean;
  notes?: string | null;
  dueDate?: string | null;
  tags?: string | null;
};

export function PriorityTasksPanel({ tasks }: Props) {
  const [items, setItems] = useState<PriorityTask[]>(tasks);
  const [detail, setDetail] = useState<{ open: boolean; task: PriorityTask | null }>({
    open: false,
    task: null,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const updateTask = (taskId: string, projectId: string, payload: TaskPatchPayload) =>
    fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

  const deleteTask = async (taskId: string, projectId: string) => {
    await fetch(`/api/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" });
    setItems((prev) => prev.filter((t) => t.id !== taskId));
  };

  const togglePriority = async (task: PriorityTask, next: boolean) => {
    await updateTask(task.id, task.projectId, { priority: next });
    setItems((prev) =>
      next
        ? prev.map((t) => (t.id === task.id ? { ...t, priority: next } : t))
        : prev.filter((t) => t.id !== task.id)
    );
  };

  const toggleSelected = (taskId: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(taskId);
      } else {
        next.delete(taskId);
      }
      return next;
    });
  };

  const markCompleteSelected = async () => {
    const ids = Array.from(selected);
    await Promise.all(
      ids.map((id) => {
        const task = items.find((t) => t.id === id);
        if (!task) return Promise.resolve();
        return updateTask(task.id, task.projectId, { status: "completed" });
      })
    );
    setItems((prev) => prev.map((t) => (selected.has(t.id) ? { ...t, status: "completed" } : t)));
    setSelected(new Set());
  };

  const deleteSelected = async () => {
    const ids = Array.from(selected);
    await Promise.all(
      ids.map((id) => {
        const task = items.find((t) => t.id === id);
        if (!task) return Promise.resolve();
        return fetch(`/api/projects/${task.projectId}/tasks/${task.id}`, { method: "DELETE" });
      })
    );
    setItems((prev) => prev.filter((t) => !selected.has(t.id)));
    setSelected(new Set());
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#9bc4ff]/40 bg-gradient-to-br from-[#eef5ff] via-white to-white px-6 py-4 shadow-[0_24px_60px_-40px_rgba(15,106,232,0.45)] backdrop-blur">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(15,106,232,0.25),transparent_60%)]" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#1b4c96]">Priority Tasks</p>
          <h2 className="text-lg font-semibold text-slate-900">Starred across projects</h2>
          <p className="text-xs text-slate-500">High-impact items to tackle first.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={markCompleteSelected}
            disabled={selected.size === 0}
            className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark Complete
          </button>
          <button
            type="button"
            onClick={deleteSelected}
            disabled={selected.size === 0}
            className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete
          </button>
          <span className="text-xs text-slate-500">{items.length} total</span>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((t) => (
          <div
            key={t.id}
            role="button"
            tabIndex={0}
            onClick={() => setDetail({ open: true, task: t })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setDetail({ open: true, task: t });
            }}
            className="rounded-2xl border border-slate-200/50 bg-white/80 px-4 py-3 text-sm shadow-sm transition hover:-translate-y-0.5 hover:border-[#9bc4ff] hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(t.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => toggleSelected(t.id, e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#9bc4ff] text-[#9bc4ff]"
                />
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">{t.title}</p>
                  <p className="text-xs text-slate-500">
                    Project:{" "}
                    <Link
                      href={`/projects/${t.projectId}/tasks`}
                      className="text-[#1b4c96] font-semibold hover:underline"
                    >
                      {t.projectName}
                    </Link>
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold">
                      {t.status === "completed" ? "Completed" : "Open"}
                    </span>
                    {t.dueDate ? (
                      <span className="rounded-full bg-[#eaf2ff] px-2 py-0.5 font-semibold text-[#1b4c96]">
                        Due {new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePriority(t, !(t.priority ?? true));
                  }}
                  className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-sm text-amber-600 shadow-sm shadow-amber-200/40 hover:bg-amber-100"
                  title="Toggle priority"
                >
                  {t.priority === false ? "☆ Priority" : "★ Priority"}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetail({ open: true, task: t });
                  }}
                  className="rounded-md border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-100"
                  title="Edit notes"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTask(t.id, t.projectId);
                  }}
                  className="rounded-md border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50"
                  title="Delete task"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 ? (
          <p className="text-xs text-slate-500">No priority tasks yet.</p>
        ) : null}
      </div>

      <TaskDetailModal
        open={detail.open}
        title={detail.task?.title || ""}
        status={detail.task?.status || "upcoming"}
        dueDate={detail.task?.dueDate || null}
        tags={detail.task?.tags || ""}
        notes={detail.task?.notes || ""}
        onClose={() => setDetail({ open: false, task: null })}
        onSave={async (notes) => {
          const taskId = detail.task?.id;
          const projectId = detail.task?.projectId;
          if (!taskId || !projectId) return;
          await updateTask(taskId, projectId, { notes });
          setItems((prev) => prev.map((t) => (t.id === taskId ? { ...t, notes } : t)));
          setDetail({ open: false, task: null });
        }}
      />
    </div>
  );
}


