"use client";

import { useEffect, useMemo, useState } from "react";

type Task = {
  id: string;
  title: string;
  dueDate: string | null;
  status: "upcoming" | "overdue" | "completed" | string;
};

type TimelineItem = {
  label: string;
  date: string;
};

type Template = {
  id: string;
  name: string;
};

type TaskListItem = {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
};

type ParsedItem = { key: string; label: string; value: string };

type Props = {
  transactionId: string;
  address: string;
  parsedSummary: ParsedItem[];
  initialTasks: Task[];
  timeline: TimelineItem[];
};

export function TransactionTasksBoard({
  transactionId,
  address,
  parsedSummary,
  initialTasks,
  timeline,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [updatingDueId, setUpdatingDueId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    };
    fetchTemplates();
  }, []);

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return tasks;
    return tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));
  }, [tasks, search]);

  const addTask = async () => {
    if (!newTitle.trim()) return;
    setIsAdding(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId,
          title: newTitle,
          dueDate: newDue || null,
          status: "upcoming",
        }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setTasks((prev) => [
        ...prev,
        {
          id: created.id,
          title: created.title,
          dueDate: created.dueDate,
          status: created.status,
        },
      ]);
      setNewTitle("");
      setNewDue("");
    } catch (e) {
      // ignore error toast for brevity
    } finally {
      setIsAdding(false);
    }
  };

  const applyTemplate = async () => {
    if (!selectedTemplate) return;
    setIsApplyingTemplate(true);
    try {
      const res = await fetch(`/api/templates/${selectedTemplate}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId }),
      });
      if (!res.ok) throw new Error();
      // refetch tasks
      const list = await fetch(`/api/tasks/list?transactionId=${transactionId}`);
      if (list.ok) {
        const data = (await list.json()) as TaskListItem[];
        setTasks(
          data.map((t) => ({
            id: t.id,
            title: t.title,
            dueDate: t.dueDate,
            status: t.status,
          }))
        );
      }
    } catch (e) {
      // ignore error toast for brevity
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  const updateDueDate = async (taskId: string, dueDate: string | null) => {
    setUpdatingDueId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Unable to update due date");
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, dueDate: body.dueDate } : t)));
    } finally {
      setUpdatingDueId(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Tasks</p>
            <p className="text-xl font-semibold text-slate-900">{address}</p>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Apply template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              onClick={applyTemplate}
              disabled={!selectedTemplate || isApplyingTemplate}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-50"
            >
              {isApplyingTemplate ? "Applying…" : "Apply"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-600">New task</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Send fully executed contract"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Due date</label>
              <input
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <button
              onClick={addTask}
              disabled={isAdding}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
            >
              {isAdding ? "Adding…" : "Add task"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <input
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="mt-4 space-y-3">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                  <p className="text-xs text-slate-500">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No date"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                    disabled={updatingDueId === task.id}
                    onChange={(e) => updateDueDate(task.id, e.target.value || null)}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm focus:border-emerald-500 focus:outline-none disabled:opacity-60"
                    title="Set due date"
                  />
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-semibold uppercase text-slate-700">
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
            {filteredTasks.length === 0 ? (
              <p className="text-sm text-slate-500">No tasks yet. Add one or apply a template.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Timeline</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            {timeline.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <span>{item.label}</span>
                <span className="text-xs font-semibold text-slate-500">{item.date}</span>
              </div>
            ))}
            {timeline.length === 0 ? <p className="text-xs text-slate-500">No dates parsed yet.</p> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Parsed items</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            {parsedSummary.map((item) => (
              <div key={item.key} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="text-sm font-medium text-slate-800 break-words">{item.value}</p>
              </div>
            ))}
            {parsedSummary.length === 0 ? <p className="text-xs text-slate-500">No parsed items saved.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

