"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Project = {
  id: string;
  name: string;
  updatedAt: string;
};

type Props = {
  projects: Project[];
};

export function CompletedProjectsList({ projects }: Props) {
  const router = useRouter();
  const [draggingId, setDraggingId] = useState<string | null>(null);

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Completed Projects</h2>
        <span className="text-xs text-slate-500">{projects.length} total</span>
      </div>
      <div className="mt-3 space-y-2">
        {projects.map((p) => (
          <div
            key={p.id}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/projects/${p.id}/tasks`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") router.push(`/projects/${p.id}/tasks`);
            }}
            className={`flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm shadow-sm hover:border-[#9bc4ff] ${
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
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-slate-500">
                  Updated {new Date(p.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
            </div>
          </div>
        ))}
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
            No completed projects yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}

