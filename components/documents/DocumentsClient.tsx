"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type DocumentItem = {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
  documentUrl: string;
};

type ApiDoc = DocumentItem & {
  project?: { id: string; name: string } | null;
  transaction?: { id: string; address: string | null } | null;
};

export function DocumentsClient() {
  const [docs, setDocs] = useState<ApiDoc[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/documents", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Unable to load documents.");
      }
      const data = (await res.json()) as ApiDoc[];
      setDocs(data);
      setSelected(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to load documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const allSelected = useMemo(() => docs.length > 0 && selected.size === docs.length, [docs.length, selected]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (docs.length === 0) return prev;
      return prev.size === docs.length ? new Set() : new Set(docs.map((d) => d.id));
    });
  };

  const deleteSelected = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} document${ids.length === 1 ? "" : "s"}?`)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Unable to delete documents.");
      }
      setDocs((prev) => prev.filter((d) => !selected.has(d.id)));
      setSelected(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to delete documents.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Documents</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Your uploads</h1>
        </div>
        <Link
          href="/upload"
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
        >
          Upload PDF
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={toggleSelectAll}
          disabled={docs.length === 0}
          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {allSelected ? "Clear selection" : "Select all"}
        </button>
        <button
          type="button"
          onClick={deleteSelected}
          disabled={selected.size === 0 || deleting}
          className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
        >
          {deleting ? "Deleting..." : `Delete selected (${selected.size})`}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-sm text-slate-600">
            Loading documents...
          </div>
        ) : docs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-sm text-slate-600">
            No documents yet.
          </div>
        ) : (
          docs.map((d) => (
            <div key={d.id} className="rounded-2xl border border-slate-200/70 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(d.id)}
                    onChange={() => toggleSelect(d.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0f6ae8]"
                    aria-label={`Select ${d.filename}`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{d.filename}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {Math.round(d.size / 1024)} KB ·{" "}
                      {new Date(d.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
                <Link
                  href={d.documentUrl}
                  className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  View
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
