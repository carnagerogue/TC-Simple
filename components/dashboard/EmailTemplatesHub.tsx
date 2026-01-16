"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { TemplateCategory } from "@prisma/client";

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
  usageCount?: number;
};

type Stats = {
  total: number;
  favorites: number;
  mostUsed: { name: string; count: number } | null;
};

type TemplatesApiResponse = {
  templates?: Template[];
  stats?: Stats;
  error?: string;
};

export function EmailTemplatesHub() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, favorites: 0, mostUsed: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/email-templates", { cache: "no-store" });
        const json = (await res.json()) as TemplatesApiResponse;
        if (!res.ok) throw new Error(json.error || "Failed to load templates");
        setTemplates(json.templates || []);
        setStats(
          json.stats || {
            total: (json.templates || []).length,
            favorites: (json.templates || []).filter((t) => t.favorite).length,
            mostUsed: null,
          }
        );
      } catch (e: unknown) {
        const error = e as { message?: string };
        setError(error.message || "Unable to load templates");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const topTemplates = useMemo(() => {
    return [...templates]
      .sort((a, b) => Number(b.favorite) - Number(a.favorite))
      .slice(0, 3);
  }, [templates]);

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/85 p-5 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Email Templates</p>
          <h2 className="text-lg font-semibold text-slate-900">Template Control Center</h2>
          <p className="text-sm text-slate-500">Favorites, usage, and quick creation.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/email-templates"
            className="rounded-lg bg-[#0275ff] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0169e6]"
          >
            Manage Templates
          </Link>
          <Link
            href="/email-templates"
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            + New Template
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-slate-500">Loading templates...</p>
      ) : error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatCard label="Templates" value={stats.total} />
            <StatCard label="Favorites" value={stats.favorites} />
            <StatCard
              label="Most Used"
              value={stats.mostUsed?.name ? stats.mostUsed.name : "—"}
              helper={stats.mostUsed?.count ? `${stats.mostUsed.count} uses` : undefined}
            />
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Top templates</p>
              <Link href="/email-templates" className="text-xs font-semibold text-[#1b4c96] hover:underline">
                View all
              </Link>
            </div>
            {templates.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                No templates yet. Create one here →{" "}
                <Link href="/email-templates" className="text-[#1b4c96] underline">
                  Create Template
                </Link>
              </div>
            ) : (
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {topTemplates.map((t) => (
                  <TemplateMiniCard key={t.id} tmpl={t} />
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-600">Analytics</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <div className="rounded-full bg-white px-3 py-1 shadow-sm">
                Most Used This Month: {stats.mostUsed?.name || "—"}
              </div>
              {stats.mostUsed?.count ? (
                <div className="rounded-full bg-white px-3 py-1 shadow-sm">
                  Used {stats.mostUsed.count} times
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <h3 className="text-xl font-semibold text-slate-900 mt-1">{value}</h3>
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function TemplateMiniCard({ tmpl }: { tmpl: Template }) {
  return (
    <Link
      href={`/email-templates`}
      className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm hover:border-[#9bc4ff]"
    >
      <div className="space-y-1">
        <p className="font-semibold text-slate-900 line-clamp-1">{tmpl.name}</p>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600">
          <span className="rounded-full bg-slate-100 px-2 py-0.5">{tmpl.category.toLowerCase()}</span>
          {tmpl.tags
            ? tmpl.tags.split(",").slice(0, 3).map((t) => (
                <span key={t} className="rounded-full bg-[#eaf2ff] px-2 py-0.5 text-[#1b4c96]">
                  {t.trim()}
                </span>
              ))
            : null}
        </div>
        <p className="text-[11px] text-slate-500">Updated {new Date(tmpl.updatedAt).toLocaleDateString()}</p>
        <p className="line-clamp-2 text-[12px] text-slate-600 mt-1 whitespace-pre-wrap">{tmpl.body}</p>
      </div>
      <span className="mt-2 text-[11px] font-semibold text-slate-500">View in manager →</span>
    </Link>
  );
}

