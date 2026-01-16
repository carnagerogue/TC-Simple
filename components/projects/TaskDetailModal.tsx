"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type TaskDetailModalProps = {
  open: boolean;
  title: string;
  status: string;
  dueDate?: string | null;
  tags?: string | null;
  notes?: string | null;
  onClose: () => void;
  onSave: (notes: string) => Promise<void>;
};

export function TaskDetailModal({
  open,
  title,
  status,
  dueDate,
  tags,
  notes,
  onClose,
  onSave,
}: TaskDetailModalProps) {
  const [draftNotes, setDraftNotes] = useState(notes ?? "");
  const [mounted, setMounted] = useState(false);
  const due = dueDate ? new Date(dueDate).toLocaleDateString() : null;

  // Sync incoming notes each time the modal opens for a task
  useEffect(() => {
    if (open) {
      setDraftNotes(notes ?? "");
    }
  }, [open, notes]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm">
      <div className="modal-container fixed left-1/2 top-1/2 z-[9999] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Task</p>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-[#eaf2ff] px-2 py-1 text-[#1b4c96]">{status}</span>
              {due ? <span>Due {due}</span> : null}
            </div>
            {tags ? (
              <p className="mt-1 text-xs text-slate-500">
                Tags:{" "}
                <span className="font-semibold text-slate-700">
                  {tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-4">
          <label className="text-sm font-semibold text-slate-800">Notes / Memo</label>
          <textarea
            value={draftNotes}
            onChange={(e) => setDraftNotes(e.target.value)}
            rows={6}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
            placeholder="Add context, call notes, commitments, or next steps..."
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              await onSave(draftNotes);
              onClose();
            }}
            className="rounded-lg bg-[#9bc4ff] px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-[#8bb8f5]"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}


