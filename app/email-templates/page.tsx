"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { TemplateModal } from "@/components/email-templates/TemplateModal";
import { TemplateCategory } from "@prisma/client";

// Clean Type definition
type Template = {
  id: string;
  name: string;
  category: TemplateCategory;
  description?: string | null;
  subject: string;
  body: string;
  favorite: boolean;
  tags?: string | null;
  version: number;
  updatedAt: string;
};

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);

  // Senior Fix: Memoize fetchTemplates using useCallback to fix the dependency warning
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category !== "ALL") params.set("category", category);
    
    try {
      const res = await fetch(`/api/email-templates?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load templates");
      const data = await res.json();
      const list = Array.isArray(data?.templates)
        ? data.templates
        : Array.isArray(data)
        ? data
        : [];
      setTemplates(list);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Unable to load templates";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [q, category]); // These are the reactive dependencies

  useEffect(() => {
    // Initial load and category changes
    fetchTemplates();
  }, [fetchTemplates]); // Now safely includes the memoized function

  useEffect(() => {
    // Search debouncing logic
    const handle = setTimeout(() => {
      if (q) fetchTemplates();
    }, 250);
    return () => clearTimeout(handle);
  }, [q, fetchTemplates]);

  const filtered = useMemo(() => {
    if (!Array.isArray(templates)) return [];
    return templates;
  }, [templates]);

  const toggleFavorite = async (tmpl: Template) => {
    const res = await fetch(`/api/email-templates/${tmpl.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: !tmpl.favorite }),
    });
    if (res.ok) fetchTemplates();
  };

  const handleDelete = async (tmpl: Template) => {
    if (!confirm(`Delete template "${tmpl.name}"?`)) return;
    const res = await fetch(`/api/email-templates/${tmpl.id}`, { method: "DELETE" });
    if (res.ok) fetchTemplates();
  };

  // Senior Fix: Safely transform Template | null to TemplateModal's expected type
  // This removes the 'any' error and handles the null-to-undefined conversion properly
  const modalInitialData = useMemo(() => {
    if (!editing) return undefined;
    
    return {
      ...editing,
      description: editing.description ?? undefined,
      tags: editing.tags ?? undefined,
    };
  }, [editing]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Email Templates</p>
            <h1 className="text-3xl font-semibold text-slate-900">Template Manager</h1>
            <p className="text-sm text-slate-500">Create, organize, and favorite templates for fast drafting.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search templates..."
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
            >
              <option value="ALL">All categories</option>
              {Object.keys(TemplateCategory).map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0) + c.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              className="rounded-lg bg-[#0275ff] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0169e6]"
            >
              Create New Template
            </button>
          </div>
        </div>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        <div className="grid gap-3 md:grid-cols-2">
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No templates found.</div>
          ) : (
            filtered.map((tmpl) => (
              <div
                key={tmpl.id}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#9bc4ff]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{tmpl.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5">{tmpl.category.toLowerCase()}</span>
                      {tmpl.tags ? (
                        tmpl.tags.split(",").map((t) => (
                          <span key={t} className="rounded-full bg-[#eaf2ff] px-2 py-0.5 text-[#1b4c96]">
                            {t.trim()}
                          </span>
                        ))
                      ) : null}
                    </div>
                    {tmpl.description ? (
                      <p className="text-xs text-slate-500">{tmpl.description}</p>
                    ) : null}
                    <p className="text-xs text-slate-500">Updated {new Date(tmpl.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(tmpl)}
                    title="Favorite"
                    className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                      tmpl.favorite ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    ★
                  </button>
                </div>
                <div className="flex items-center justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(tmpl);
                      setModalOpen(true);
                    }}
                    className="rounded-md border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(tmpl)}
                    className="rounded-md border border-red-200 px-3 py-1 font-semibold text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <TemplateModal
        open={modalOpen}
        initial={modalInitialData}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSaved={fetchTemplates}
      />
    </div>
  );
}