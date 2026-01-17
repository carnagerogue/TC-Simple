"use client";

import { useState, useEffect } from "react";
import { TASK_ROLE_TAGS, TASK_WORKFLOW_TAGS, getTagLabel } from "@/lib/taskTags";
import { EMAIL_TAG_SUGGESTIONS, getEmailTagMeta } from "@/lib/emailTagging";

type Props = {
  open: boolean;
  initialTags?: string;
  onClose: () => void;
  onSave: (tags: string) => Promise<void> | void;
};

export function TagEditModal({ open, initialTags, onClose, onSave }: Props) {
  const [value, setValue] = useState(initialTags || "");

  useEffect(() => {
    setValue(initialTags || "");
  }, [initialTags, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-gray-900">Edit Tags</h3>
        <p className="mt-1 text-sm text-gray-500">Add tags separated by commas.</p>
        <input
          className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#9bc4ff] focus:outline-none"
          placeholder="e.g., buyer_client, escrow, closing"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="mt-3 space-y-3 text-xs">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Roles</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TASK_ROLE_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
                    if (!parts.includes(t)) {
                      const next = [...parts, t].join(", ");
                      setValue(next);
                    }
                  }}
                  className="rounded-full bg-[#eaf2ff] px-3 py-1 text-[#1b4c96] hover:bg-[#d7e8ff]"
                >
                  {getTagLabel(t)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Workflow</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TASK_WORKFLOW_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
                    if (!parts.includes(t)) {
                      const next = [...parts, t].join(", ");
                      setValue(next);
                    }
                  }}
                  className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
                >
                  {getTagLabel(t)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Email</p>
            <p className="mt-1 text-[11px] text-slate-500">
              Email tags enable sending a template email from this task.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EMAIL_TAG_SUGGESTIONS.map(({ token, role }) => {
                const meta = getEmailTagMeta(role);
                return (
                  <button
                    key={token}
                    type="button"
                    onClick={() => {
                      const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
                      if (!parts.includes(token)) {
                        const next = [...parts, token].join(", ");
                        setValue(next);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-700 hover:bg-indigo-100"
                  >
                    <span aria-hidden>✉</span>
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              await onSave(value.trim());
            }}
            className="rounded-lg bg-[#9bc4ff] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#82b4ff]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

