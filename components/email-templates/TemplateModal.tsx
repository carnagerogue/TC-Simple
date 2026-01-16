"use client";

import { useEffect, useState } from "react";
import { ALLOWED_PLACEHOLDERS, validatePlaceholders } from "@/lib/emailTemplates";
import { TemplateCategory } from "@prisma/client";

type TemplatePayload = {
  name: string;
  category: TemplateCategory | string;
  description?: string;
  subject: string;
  body: string;
  tags?: string;
  favorite?: boolean;
};

type CategoryOption = TemplateCategory | "GENERAL";

type Props = {
  open: boolean;
  initial?: Partial<TemplatePayload> & { id?: string; version?: number };
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

export function TemplateModal({ open, initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState<TemplatePayload>({
    name: "",
    category: "GENERAL",
    description: "",
    subject: "",
    body: "",
    tags: "",
    favorite: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unknown, setUnknown] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      const initialCategory =
        typeof initial?.category === "string" ? (initial.category.toUpperCase() as CategoryOption) : initial?.category;
      setForm({
        name: initial?.name || "",
        category: initialCategory || "GENERAL",
        description: initial?.description || "",
        subject: initial?.subject || "",
        body: initial?.body || "",
        tags: initial?.tags || "",
        favorite: Boolean(initial?.favorite),
      });
      setError(null);
      setUnknown([]);
    }
  }, [open, initial]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const validation = validatePlaceholders(`${form.subject}\n${form.body}`);
    setUnknown(validation.unknown);
    try {
      const payload = { ...form, category: (form.category as string).toUpperCase() };
      const res = await fetch(initial?.id ? `/api/email-templates/${initial.id}` : "/api/email-templates", {
        method: initial?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Unable to save template");
      await onSaved();
      onClose();
    } catch (e: unknown) {
      const error = e as { message?: string };
      setError(error.message || "Unable to save template");
    } finally {
      setSaving(false);
    }
  };

  const insertPlaceholder = (key: string) => {
    const textarea = document.getElementById("template-body") as HTMLTextAreaElement | null;
    if (!textarea) {
      setForm((f) => ({ ...f, body: `${f.body}{${key}}` }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = form.body.slice(0, start) + `{${key}}` + form.body.slice(end);
    setForm((f) => ({ ...f, body: next }));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + key.length + 2;
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="flex w-full max-w-5xl flex-col gap-4 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Email Template</p>
            <h3 className="text-lg font-semibold text-slate-900">
              {initial?.id ? "Edit template" : "Create template"}
            </h3>
            {initial?.version ? (
              <p className="text-xs text-slate-500">Version {initial.version}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50"
          >
            ✕
          </button>
        </div>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div> : null}
        {unknown.length ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
            ⚠ Unknown placeholders: {unknown.join(", ")}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">Template Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
                  placeholder="Intro email to buyer"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
                >
                  {Object.keys(TemplateCategory).map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0) + c.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Tags (comma separated)</label>
              <input
                value={form.tags || ""}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
                placeholder="buyer, escrow, closing"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Description</label>
              <input
                value={form.description || ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
                placeholder="Short explanation"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Subject</label>
              <input
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
                placeholder="Subject line..."
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Body</label>
              <textarea
                id="template-body"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                rows={12}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
                placeholder="Hello {buyerName}, ..."
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Favorite</label>
              <input
                type="checkbox"
                checked={form.favorite}
                onChange={(e) => setForm((f) => ({ ...f, favorite: e.target.checked }))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Available Variables</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ALLOWED_PLACEHOLDERS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => insertPlaceholder(p)}
                    className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-[#1b4c96] shadow-sm hover:bg-[#eaf2ff]"
                  >
                    {"{"}
                    {p}
                    {"}"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[#0275ff] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0169e6] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>
    </div>
  );
}

