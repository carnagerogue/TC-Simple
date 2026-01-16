"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void> | void;
};

export function ProjectCreateModal({ open, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-gray-900">Name Your Project</h3>
        <p className="mt-1 text-sm text-gray-500">
          Give this transaction a recognizable name (e.g., “20308 73rd Ave NE - Buyer Contract”).
        </p>
        <input
          className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#9bc4ff] focus:outline-none"
          placeholder="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
            disabled={!name.trim() || submitting}
            onClick={async () => {
              setSubmitting(true);
              try {
                await onSubmit(name.trim());
                setName("");
              } finally {
                setSubmitting(false);
              }
            }}
            className="rounded-lg bg-[#9bc4ff] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#82b4ff] disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}

