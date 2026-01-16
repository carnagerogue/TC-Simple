"use client";

import { useMemo, useState } from "react";
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

  const columnData: Record<ColumnKey, ProjectCard[]> = useMemo(
    () => ({
      primary: primaryList,
      active: activeList,
      completed: completedList,
    }),
    [primaryList, activeList, completedList]
  );

  const setColumn = (key: ColumnKey, list: ProjectCard[]) => {
    if (key === "primary") setPrimaryList(list);
    else if (key === "active") setActiveList(list);
    else setCompletedList(list);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMarkComplete = async (ids: string[]) => {
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
    // Move to completed locally
    setActiveList((prev) => prev.filter((p) => !ids.includes(p.id)));
    setPrimaryList((prev) => prev.filter((p) => !ids.includes(p.id)));
    setCompletedList((prev) => [
      ...prev,
      ...activeList
        .filter((p) => ids.includes(p.id))
        .map((p) => ({ ...p, status: "completed", tasks: p.tasks.map((t) => ({ ...t, status: "completed" })) })),
      ...primaryList
        .filter((p) => ids.includes(p.id))
        .map((p) => ({ ...p, status: "completed", tasks: p.tasks.map((t) => ({ ...t, status: "completed" })) })),
    ]);
    router.refresh();
  };

  const handleDelete = async (ids: string[]) => {
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
  };

  const handleDrop = async (target: ColumnKey) => {
    if (!draggingId) return;

    // find project and its source column
    let source: ColumnKey | null = null;
    let project: ProjectCard | undefined;
    (["primary", "active", "completed"] as ColumnKey[]).forEach((key) => {
      if (source) return;
      const found = columnData[key].find((p) => p.id === draggingId);
      if (found) {
        source = key;
        project = found;
      }
    });
    if (!project || !source) {
      setDraggingId(null);
      setDragOver(null);
      return;
    }

    const isPrimary = target === "primary";
    const status = target === "completed" ? "completed" : "active";

    try {
      await fetch(`/api/projects/${project.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, isPrimary }),
      });

      // update UI lists
      const nextSourceList = columnData[source].filter((p) => p.id !== project!.id);
      setColumn(source, nextSourceList);

      const updatedProject: ProjectCard = { ...project, status, isPrimary };
      if (target === "completed") {
        updatedProject.tasks = updatedProject.tasks.map((t) => ({ ...t, status: "completed" }));
      }

      // if setting primary, clear other primaries locally
      if (isPrimary) {
        setPrimaryList([updatedProject]);
        setActiveList((prev) => prev.map((p) => ({ ...p, isPrimary: false })));
        setCompletedList((prev) => prev.map((p) => ({ ...p, isPrimary: false })));
      } else {
        // remove from primary if moving out
        setPrimaryList((prev) => prev.filter((p) => p.id !== project!.id));
        setColumn(target, [...columnData[target].filter((p) => p.id !== project!.id), updatedProject]);
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
          isDragging ? "border-[#9bc4ff]" : "border-slate-200/70"
        } bg-white px-4 py-3 text-sm shadow-sm hover:border-[#9bc4ff] ${isDragging ? "opacity-70" : ""}`}
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
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">{p.name}</p>
            <p className="text-xs text-slate-500">
              {openCount} open / {total} tasks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {p.isPrimary ? (
            <span className="rounded-full bg-[#eaf2ff] px-2 py-1 text-[11px] font-semibold text-[#1b4c96]">
              Primary
            </span>
          ) : null}
          <span>{new Date(p.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        </div>
      </div>
    );
  };

  const dropZoneClasses = (key: ColumnKey) =>
    `rounded-3xl border ${
      dragOver === key ? "border-[#9bc4ff] bg-[#f5f8ff]" : "border-slate-200/70 bg-white/80"
    } p-5 shadow-sm backdrop-blur transition`;

  const columnActions = (col: ColumnKey) => {
    const ids = columnData[col].filter((p) => selected.has(p.id)).map((p) => p.id);
    const hasSelection = ids.length > 0;
    return (
      <div className="flex items-center gap-2">
        {col !== "completed" ? (
          <button
            type="button"
            disabled={!hasSelection}
            onClick={() => handleMarkComplete(ids)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Mark Complete
          </button>
        ) : null}
        <button
          type="button"
          disabled={!hasSelection}
          onClick={() => handleDelete(ids)}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {(["primary", "active", "completed"] as ColumnKey[]).map((col) => (
        <div
          key={col}
          className={dropZoneClasses(col)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(col);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver((prev) => (prev === col ? null : prev));
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(col);
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{columnLabels[col]}</h2>
              <span className="text-xs text-slate-500">{columnData[col].length} total</span>
            </div>
            {columnActions(col)}
          </div>
          <div className="mt-3 space-y-2 min-h-[80px]">
            {columnData[col].map((p) => card(p))}
            {columnData[col].length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                Drop a project here.
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}


