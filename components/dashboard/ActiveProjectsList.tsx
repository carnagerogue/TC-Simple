"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Project = {
  id: string;
  name: string;
  updatedAt: string;
  tasks: { status: string }[];
};

type Props = {
  projects: Project[];
};

export function ActiveProjectsList({ projects }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const completeSelected = async () => {
    const ids = Array.from(selected);
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/projects/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        })
      )
    );
    setSelected(new Set());
    router.refresh();
  };

  const deleteSelected = async () => {
    const ids = Array.from(selected);
    await Promise.all(ids.map((id) => fetch(`/api/projects/${id}`, { method: "DELETE" })));
    setSelected(new Set());
    router.refresh();
  };

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Active Projects</h2>
          <span className="text-xs text-slate-500">{projects.length} total</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={completeSelected}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Mark Complete
          </button>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={deleteSelected}
            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {projects.map((p) => {
          const openCount = p.tasks.filter((t) => t.status !== "completed").length;
          const total = p.tasks.length;
          const isSelected = selected.has(p.id);
          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/projects/${p.id}/tasks`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") router.push(`/projects/${p.id}/tasks`);
              }}
              className={`flex items-center justify-between rounded-2xl border ${
                isSelected ? "border-[#9bc4ff]" : "border-slate-200/70"
              } bg-white px-4 py-3 text-sm shadow-sm hover:border-[#9bc4ff] ${
                draggingId === p.id ? "opacity-70" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-5 w-5 items-center justify-center text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing"
                  draggable="true"
                  onClick={(e) => e.stopPropagation()}
                  onDragStart={(e) => {
                    e.stopPropagation();
                    setDraggingId(p.id);
                    e.dataTransfer.setData("text/plain", p.id);
                  }}
                  onDragEnd={(e) => {
                    e.stopPropagation();
                    setDraggingId(null);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
                    <circle cx="2" cy="2" r="1" />
                    <circle cx="7" cy="2" r="1" />
                    <circle cx="12" cy="2" r="1" />
                    <circle cx="2" cy="7" r="1" />
                    <circle cx="7" cy="7" r="1" />
                    <circle cx="12" cy="7" r="1" />
                    <circle cx="2" cy="12" r="1" />
                    <circle cx="7" cy="12" r="1" />
                    <circle cx="12" cy="12" r="1" />
                  </svg>
                </div>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onChange={() => toggle(p.id)}
                  className="h-4 w-4 rounded border-[#9bc4ff] text-[#9bc4ff] focus:ring-[#9bc4ff]"
                />
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    {openCount} open / {total} tasks
                  </p>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                {new Date(p.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </div>
          );
        })}
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
            No active projects.
          </div>
        ) : null}
      </div>
    </div>
  );
}

