"use client";

import { useEffect, useState } from "react";

type HistoryProject = {
  projectId: string;
  projectName: string;
  role: string;
  closingDate: string | null;
  address: string | null;
  status: string;
};

type HistoryResponse = {
  contact: {
    id: string;
    firstName: string;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  projects: HistoryProject[];
  summary: { totalTransactions: number; mostCommonRole: string | null };
};

const ROLE_COLORS: Record<string, string> = {
  BUYER: "bg-emerald-50 text-emerald-700",
  SELLER: "bg-purple-50 text-purple-700",
  BUYER_AGENT: "bg-blue-50 text-blue-700",
  SELLER_AGENT: "bg-blue-50 text-blue-700",
  ESCROW: "bg-amber-50 text-amber-700",
  LENDER: "bg-teal-50 text-teal-700",
  VENDOR: "bg-slate-100 text-slate-700",
};

export function ContactHistoryModal({
  contactId,
  open,
  onClose,
}: {
  contactId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !contactId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/contacts/${contactId}/history`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load history");
        }
        return res.json();
      })
      .then((json) => setData(json))
      .catch((e: any) => setError(e.message || "Unable to load history"))
      .finally(() => setLoading(false));
  }, [open, contactId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Project History</p>
            <h3 className="text-lg font-semibold text-slate-900">
              {data ? `${data.contact.firstName} ${data.contact.lastName || ""}`.trim() : "Contact"}
            </h3>
            {data?.summary ? (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold">
                  Transactions: {data.summary.totalTransactions}
                </span>
                {data.summary.mostCommonRole ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold">
                    Common Role: {data.summary.mostCommonRole.replaceAll("_", " ").toLowerCase()}
                  </span>
                ) : null}
              </div>
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

        <div className="mt-4 min-h-[120px]">
          {loading ? <p className="text-sm text-slate-500">Loading...</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {!loading && !error && data ? (
            <div className="space-y-3 animate-[fadeIn_0.2s_ease-in]">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Projects ({data.projects.length})
              </div>
              {data.projects.length === 0 ? (
                <p className="text-sm text-slate-500">No linked projects yet.</p>
              ) : (
                <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-slate-50">
                  {data.projects.map((p) => (
                    <div
                      key={p.projectId + p.role}
                      className="flex flex-col gap-2 p-3 transition hover:bg-white"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900">{p.projectName}</div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            ROLE_COLORS[p.role] || "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {p.role.replaceAll("_", " ").toLowerCase()}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                        {p.status ? (
                          <span className="rounded-full bg-white px-2 py-0.5 font-semibold capitalize">
                            {p.status}
                          </span>
                        ) : null}
                        {p.closingDate ? <span>Closing: {new Date(p.closingDate).toLocaleDateString()}</span> : null}
                        {p.address ? <span>{p.address}</span> : null}
                      </div>
                      <div className="flex justify-end">
                        <a
                          href={`/projects/${p.projectId}/tasks`}
                          className="text-xs font-semibold text-[#1b4c96] hover:underline"
                        >
                          View Project
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

