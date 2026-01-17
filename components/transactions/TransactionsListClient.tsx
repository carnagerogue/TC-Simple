"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type TransactionRow = {
  id: string;
  address: string;
  stage: string;
  updatedAt: string;
  project?: { id: string; name: string } | null;
};

type Props = {
  transactions: TransactionRow[];
};

export function TransactionsListClient({ transactions }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<TransactionRow[]>(transactions);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [items]
  );

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this transaction?")) return;
    setDeletingId(id);
    const previous = items;
    setItems((prev) => prev.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Unable to delete transaction.");
      }
      router.refresh();
    } catch (e) {
      setItems(previous);
      alert(e instanceof Error ? e.message : "Unable to delete transaction.");
    } finally {
      setDeletingId((current) => (current === id ? null : current));
    }
  };

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-sm text-slate-600">
        No transactions yet. Upload a document to create one.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((t) => {
        const title = t.project?.name || t.address;
        return (
          <div key={t.id} className="rounded-2xl border border-slate-200/70 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
                {t.project?.name ? (
                  <p className="mt-1 text-xs text-slate-500">{t.address}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">
                  {t.stage || "Intake"} · Updated {new Date(t.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
                <Link
                  href={`/transactions/${t.id}`}
                  className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  View
                </Link>
                {t.project ? (
                  <Link
                    href={`/projects/${t.project.id}/tasks`}
                    className="rounded-full bg-[#0275ff] px-3 py-1 font-semibold text-white hover:bg-[#0169e6]"
                  >
                    Project plan
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleDelete(t.id)}
                  disabled={deletingId === t.id}
                  className="rounded-full border border-red-200 px-3 py-1 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
