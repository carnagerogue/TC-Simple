"use client";

import { useEffect, useState } from "react";
import { TaskTagPills } from "@/components/TaskTagPills";

type ProjectTaskCardProps = {
  title: string;
  dueDate?: string | null;
  status?: string;
  tags?: string;
  notesPreview?: string;
  priority?: boolean;
  onToggle?: (checked: boolean) => void;
  onEditTags?: () => void;
  onDelete?: () => void;
  onOpen?: () => void;
  onTogglePriority?: () => void;
  onDueDateChange?: (nextDueDate: string | null) => Promise<void> | void;
  hasEmail?: boolean;
  emailRecipientLabel?: string | null;
  emailMissing?: boolean;
  onDraftEmail?: () => void;
  onAddStakeholder?: () => void;
};

export function ProjectTaskCard({
  title,
  dueDate,
  status,
  tags,
  notesPreview,
  priority,
  onToggle,
  onEditTags,
  onDelete,
  onOpen,
  onTogglePriority,
  onDueDateChange,
  hasEmail,
  emailRecipientLabel,
  emailMissing,
  onDraftEmail,
  onAddStakeholder,
}: ProjectTaskCardProps) {
  const due = dueDate
    ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
        new Date(dueDate)
      )
    : null;
  const isDone = status === "completed";
  const [editingDue, setEditingDue] = useState(false);
  const [draftDue, setDraftDue] = useState("");
  const [savingDue, setSavingDue] = useState(false);
  const [dueError, setDueError] = useState<string | null>(null);

  useEffect(() => {
    setDraftDue(dueDate ? dueDate.slice(0, 10) : "");
  }, [dueDate]);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.();
        }
      }}
      className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition hover:bg-[rgba(155,196,255,0.1)] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff]"
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isDone}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onToggle?.(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-[#9bc4ff] text-[#9bc4ff]"
        />
        <div>
          <p className={`text-sm font-semibold ${isDone ? "text-gray-400 line-through" : "text-gray-900"}`}>
            {title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            {editingDue ? (
              <>
                <input
                  type="date"
                  value={draftDue}
                  disabled={savingDue}
                  onClick={(e) => e.stopPropagation()}
                  onChange={async (e) => {
                    const next = e.target.value;
                    setDraftDue(next);
                    setSavingDue(true);
                    setDueError(null);
                    try {
                      await onDueDateChange?.(next ? next : null);
                      setEditingDue(false);
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : "Unable to update due date";
                      setDueError(msg);
                    } finally {
                      setSavingDue(false);
                    }
                  }}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm focus:border-[#9bc4ff] focus:outline-none"
                />
                <button
                  type="button"
                  disabled={savingDue}
                  onClick={async (e) => {
                    e.stopPropagation();
                    setSavingDue(true);
                    setDueError(null);
                    try {
                      await onDueDateChange?.(null);
                      setEditingDue(false);
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : "Unable to update due date";
                      setDueError(msg);
                    } finally {
                      setSavingDue(false);
                    }
                  }}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={savingDue}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingDue(false);
                    setDraftDue(dueDate ? dueDate.slice(0, 10) : "");
                    setDueError(null);
                  }}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                {savingDue ? <span className="text-[11px] text-slate-500">Saving…</span> : null}
                {dueError ? <span className="text-[11px] text-red-600">{dueError}</span> : null}
              </>
            ) : (
              <>
                <span>{due ? `Due ${due}` : "No due date"}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingDue(true);
                    setDueError(null);
                  }}
                  className="font-semibold text-[#1b4c96] hover:underline"
                >
                  {due ? "Change" : "Add date"}
                </button>
              </>
            )}
          </div>
          {hasEmail ? (
            <p className="mt-1 text-xs text-[#1b4c96] font-semibold flex items-center gap-2">
              Email →
              {emailRecipientLabel ? (
                <span className="text-slate-700 font-semibold">{emailRecipientLabel}</span>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddStakeholder?.();
                  }}
                  className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-200"
                >
                  Missing recipient — Add stakeholder
                </button>
              )}
              {emailMissing ? (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  Missing recipient
                </span>
              ) : null}
            </p>
          ) : null}
          <TaskTagPills tags={tags} />
          {notesPreview ? (
            <p className="mt-1 text-xs text-slate-500 line-clamp-2">
              {notesPreview.length > 50 ? `${notesPreview.slice(0, 50)}…` : notesPreview}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="rounded-full bg-[#eaf2ff] px-2 py-1 text-[#1b4c96]">
          {status || "upcoming"}
        </span>
        {hasEmail ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDraftEmail?.();
            }}
            className="rounded-md border border-[#1b4c96] bg-[#eaf2ff] px-2 py-1 text-[#1b4c96] hover:bg-[#d6e6ff]"
            title="Draft email"
          >
            Draft Email
          </button>
        ) : null}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePriority?.();
          }}
          className={`rounded-md border px-2 py-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9bc4ff] ${
            priority
              ? "border-amber-300 bg-amber-50 text-amber-600"
              : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
          }`}
          title="Star / Priority"
          aria-label="Toggle priority"
        >
          {priority ? "★" : "☆"}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditTags?.();
          }}
          className="rounded-md border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9bc4ff]"
          title="Edit tags"
          aria-label="Edit tags"
        >
          ✏️
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
          className="rounded-md border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50"
          title="Delete task"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

