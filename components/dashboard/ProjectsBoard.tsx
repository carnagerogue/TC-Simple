"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type ProjectCard = {
  id: string;
  name: string;
  updatedAt: string;
  status: string;
  isPrimary: boolean;
  tasks: { status: string }[];
};

type Props = {
  primary: ProjectCard[];
  active: ProjectCard[];
  completed: ProjectCard[];
};

type ColumnKey = "primary" | "active" | "completed";

const columnLabels: Record<ColumnKey, string> = {
  primary: "Primary Transaction",
  active: "Active Projects",
  completed: "Completed Projects",
};

export function ProjectsBoard({ primary, active, completed }: Props) {
  const router = useRouter();
  const [primaryList, setPrimaryList] = useState<ProjectCard[]>(primary);
  const [activeList, setActiveList] = useState<ProjectCard[]>(active);
  const [completedList, setCompletedList] = useState<ProjectCard[]>(completed);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<ColumnKey | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const columns: ColumnKey[] = ["primary", "active", "completed"];

  const columnData: Record<ColumnKey, ProjectCard[]> = useMemo(
    () => ({
      primary: primaryList,
      active: activeList,
      completed: completedList,
    }),
    [primaryList, activeList, completedList]
  );

  const setColumn = useCallback((key: ColumnKey, list: ProjectCard[]) => {
    if (key === "primary") setPrimaryList(list);
    else if (key === "active") setActiveList(list);
    else setCompletedList(list);
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMarkComplete = async (ids: string[]) => {
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/projects/${id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "completed" }),
          })
        )
      );

      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });

      const movingProjects = [...primaryList, ...activeList]
        .filter((p) => ids.includes(p.id))
        .map((p) => ({
          ...p,
          status: "completed",
          tasks: p.tasks.map((t) => ({ ...t, status: "completed" }))
        }));

      setPrimaryList((prev) => prev.filter((p) => !ids.includes(p.id)));
      setActiveList((prev) => prev.filter((p) => !ids.includes(p.id)));
      setCompletedList((prev) => [...prev, ...movingProjects]);
      
      router.refresh();
    } catch (e) {
      console.error("Failed to mark complete", e);
    }
  };

  const handleDelete = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => fetch(`/api/projects/${id}`, { method: "DELETE" })));
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      setPrimaryList((prev) => prev.filter((p) => !ids.includes(p.id)));
      setActiveList((prev) => prev.filter((p) => !ids.includes(p.id)));
      setCompletedList((prev) => prev.filter((p) => !ids.includes(p.id)));
      router.refresh();
    } catch (e) {
      console.error("Failed to delete", e);
    }
  };

  const handleDrop = async (target: ColumnKey) => {
    if (!draggingId) return;

    let sourceCol: ColumnKey | null = null;
    let targetProject: ProjectCard | null = null;

    for (const key of columns) {
      const found = columnData[key].find((p) => p.id === draggingId);
      if (found) {
        sourceCol = key;
        targetProject = found;
        break;
      }
    }

    if (!targetProject || !sourceCol) {
      setDraggingId(null);
      setDragOver(null);
      return;
    }

    const isPrimary = target === "primary";
    const status = target === "completed" ? "completed" : "active";

    try {
      await fetch(`/api/projects/${targetProject.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, isPrimary }),
      });

      const currentSourceItems = [...columnData[sourceCol]];
      const nextSourceList = currentSourceItems.filter((p) => p.id !== draggingId);
      setColumn(sourceCol, nextSourceList);

      const updatedProject: ProjectCard = { ...targetProject, status, isPrimary };

      if (target === "completed") {
        updatedProject.tasks = updatedProject.tasks.map((t) => ({ ...t, status: "completed" }));
      }

      if (isPrimary) {
        setPrimaryList([updatedProject]);
        setActiveList((prev) => prev.map((p) => ({ ...p, isPrimary: false })));
        setCompletedList((prev) => prev.map((p) => ({ ...p, isPrimary: false })));
      } else {
        if (sourceCol === "primary") setPrimaryList([]);
        const currentTargetItems = [...columnData[target]].filter(p => p.id !== draggingId);
        setColumn(target, [...currentTargetItems, updatedProject]);
      }

      router.refresh();
    } catch (e) {
      console.error("Failed to move project", e);
    } finally {
      setDraggingId(null);
      setDragOver(null);
    }
  };

  const card = (p: ProjectCard) => {
    const openCount = p.tasks.filter((t) => t.status !== "completed").length;
    const total = p.tasks.length;
    const isDragging = draggingId === p.id;
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
          isDragging ? "border-[#9bc4ff]" : "border-slate-200/60"
        } bg-white/80 px-4 py-3 text-sm shadow-sm transition hover:-translate-y-0.5 hover:border-[#9bc4ff] hover:shadow-md ${
          isDragging ? "opacity-70" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => toggleSelect(p.id)}
            className="h-4 w-4 rounded border-[#9bc4ff] text-[#9bc4ff]"
          />
          <div
            className="flex h-5 w-5 items-center justify-center text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing"
            draggable="true"
            onDragStart={(e) => {
              setDraggingId(p.id);
              e.dataTransfer.setData("text/plain", p.id);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="2" cy="2" r="1" /><circle cx="7" cy="2" r="1" /><circle cx="12" cy="2" r="1" />
              <circle cx="2" cy="7" r="1" /><circle cx="7" cy="7" r="1" /><circle cx="12" cy="7" r="1" />
              <circle cx="2" cy="12" r="1" /><circle cx="7" cy="12" r="1" /><circle cx="12" cy="12" r="1" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">{p.name}</p>
            <p className="text-xs text-slate-500">{openCount} open / {total} tasks</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {p.isPrimary && (
            <span className="rounded-full bg-[#eaf2ff] px-2 py-1 text-[11px] font-semibold text-[#1b4c96]">
              Primary
            </span>
          )}
          <span>{new Date(p.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {columns.map((col) => (
        <div
          key={col}
          className={`rounded-3xl border ${
            dragOver === col
              ? "border-[#9bc4ff]/60 bg-[#f5f8ff]/70 shadow-[0_20px_50px_-35px_rgba(15,106,232,0.4)]"
              : "border-slate-200/40 bg-white/70 shadow-[0_16px_30px_-28px_rgba(15,106,232,0.25)]"
          } p-5 backdrop-blur transition`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(col); }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => { e.preventDefault(); handleDrop(col); }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{columnLabels[col]}</h2>
              <span className="text-xs text-slate-500">{columnData[col].length} total</span>
            </div>
            <div className="flex items-center gap-2">
              {col !== "completed" && (
                <button
                  type="button"
                  disabled={!columnData[col].some(p => selected.has(p.id))}
                  onClick={() => handleMarkComplete(columnData[col].filter(p => selected.has(p.id)).map(p => p.id))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Mark Complete
                </button>
              )}
              <button
                type="button"
                disabled={!columnData[col].some(p => selected.has(p.id))}
                onClick={() => handleDelete(columnData[col].filter(p => selected.has(p.id)).map(p => p.id))}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
          <div className="mt-3 space-y-2 min-h-[100px]">
            {columnData[col].map((p) => card(p))}
            {columnData[col].length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200/70 bg-white/70 px-4 py-8 text-center text-sm text-slate-400">
                No projects here.
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}