"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ContactAvatar } from "@/components/contacts/ContactAvatar";

type ContactDetail = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  category: string;
  company?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
};

type LinkedItem = {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  role: string;
  isPrimary: boolean;
};

type ProjectOption = {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
};

type LinksResponse = {
  projects?: LinkedItem[];
  transactions?: LinkedItem[];
  error?: string;
};

const ROLE_LABELS: Record<string, string> = {
  BUYER: "Buyer",
  SELLER: "Seller",
  BUYER_AGENT: "Buyer Agent",
  SELLER_AGENT: "Seller Agent",
  ESCROW: "Escrow",
  LENDER: "Lender",
  TITLE: "Title",
  VENDOR: "Vendor",
  INSPECTOR: "Inspector",
  OTHER: "Other",
};

const ROLE_OPTIONS = Object.keys(ROLE_LABELS);

export function ContactDetailClient({ contact }: { contact: ContactDetail }) {
  const router = useRouter();
  const [projects, setProjects] = useState<LinkedItem[]>([]);
  const [transactions, setTransactions] = useState<LinkedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);

  const [linkProjectId, setLinkProjectId] = useState("");
  const [linkRole, setLinkRole] = useState("BUYER");
  const [linkPrimary, setLinkPrimary] = useState(false);

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectRole, setNewProjectRole] = useState("BUYER");
  const [newProjectPrimary, setNewProjectPrimary] = useState(false);

  const [newTransactionAddress, setNewTransactionAddress] = useState("");
  const [newTransactionRole, setNewTransactionRole] = useState("BUYER");
  const [newTransactionPrimary, setNewTransactionPrimary] = useState(false);

  const fullName = useMemo(
    () => [contact.firstName, contact.lastName].filter(Boolean).join(" "),
    [contact.firstName, contact.lastName]
  );

  const loadLinks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${contact.id}/links`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as LinksResponse;
      if (!res.ok) throw new Error(data.error || "Unable to load linked items");
      setProjects(data.projects || []);
      setTransactions(data.transactions || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to load linked items");
    } finally {
      setLoading(false);
    }
  }, [contact.id]);

  const loadProjectOptions = useCallback(async () => {
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json().catch(() => [])) as ProjectOption[];
      setProjectOptions(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadLinks();
    loadProjectOptions();
  }, [loadLinks, loadProjectOptions]);

  const handleLinkProject = async () => {
    if (!linkProjectId) return;
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${contact.id}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "project",
          projectId: linkProjectId,
          role: linkRole,
          isPrimary: linkPrimary,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Unable to link project");
      setLinkProjectId("");
      setLinkPrimary(false);
      await loadLinks();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to link project");
    }
  };

  const handleCreateProject = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${contact.id}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "project",
          name,
          role: newProjectRole,
          isPrimary: newProjectPrimary,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Unable to create project");
      setNewProjectName("");
      setNewProjectPrimary(false);
      await loadLinks();
      await loadProjectOptions();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to create project");
    }
  };

  const handleCreateTransaction = async () => {
    const address = newTransactionAddress.trim();
    if (!address) return;
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${contact.id}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "transaction",
          address,
          role: newTransactionRole,
          isPrimary: newTransactionPrimary,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Unable to create transaction");
      setNewTransactionAddress("");
      setNewTransactionPrimary(false);
      await loadLinks();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to create transaction");
    }
  };

  const handleUnlink = async (type: "project" | "transaction", id: string, role: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${contact.id}/links`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, role, ...(type === "project" ? { projectId: id } : { transactionId: id }) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Unable to unlink");
      await loadLinks();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to unlink");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm("Delete this project?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Unable to delete project");
      await loadLinks();
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to delete project");
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!window.confirm("Delete this transaction?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${transactionId}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Unable to delete transaction");
      await loadLinks();
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to delete transaction");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <ContactAvatar name={fullName || "Unnamed"} photoUrl={contact.avatarUrl ?? undefined} />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Contact</p>
                <h1 className="text-2xl font-semibold text-slate-900">{fullName || "Unnamed"}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  {contact.email ? (
                    <a href={`mailto:${contact.email}`} className="hover:text-[#1b4c96] hover:underline">
                      {contact.email}
                    </a>
                  ) : null}
                  {contact.phone ? (
                    <a href={`tel:${contact.phone}`} className="hover:text-[#1b4c96] hover:underline">
                      {contact.phone}
                    </a>
                  ) : null}
                  {contact.company ? <span>{contact.company}</span> : null}
                  {contact.role ? <span>{contact.role}</span> : null}
                </div>
              </div>
            </div>
            <Link
              href="/contacts"
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Back to contacts
            </Link>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Linked</p>
                  <h2 className="text-lg font-semibold text-slate-900">Transactions & Projects</h2>
                </div>
                {loading ? <span className="text-xs text-slate-400">Loading…</span> : null}
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Projects</p>
                  {projects.length === 0 ? (
                    <div className="mt-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      No linked projects yet.
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {projects.map((p) => (
                        <div
                          key={`${p.id}-${p.role}`}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{p.name}</p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {p.status} · Updated {new Date(p.updatedAt).toLocaleDateString()}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Role: {ROLE_LABELS[p.role] || p.role}
                              {p.isPrimary ? " · Primary" : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/projects/${p.id}/tasks`}
                              className="rounded-full bg-[#0275ff] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#0169e6]"
                            >
                              Project plan
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleUnlink("project", p.id, p.role)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              Unlink
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProject(p.id)}
                              className="rounded-full border border-red-200 px-3 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transactions</p>
                  {transactions.length === 0 ? (
                    <div className="mt-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      No linked transactions yet.
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {transactions.map((t) => (
                        <div
                          key={`${t.id}-${t.role}`}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{t.name}</p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {t.status} · Updated {new Date(t.updatedAt).toLocaleDateString()}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Role: {ROLE_LABELS[t.role] || t.role}
                              {t.isPrimary ? " · Primary" : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/transactions/${t.id}`}
                              className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              View
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleUnlink("transaction", t.id, t.role)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              Unlink
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTransaction(t.id)}
                              className="rounded-full border border-red-200 px-3 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Link existing project</h3>
              <div className="mt-3 space-y-2">
                <select
                  value={linkProjectId}
                  onChange={(e) => setLinkProjectId(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Select a project</option>
                  {projectOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <select
                    value={linkRole}
                    onChange={(e) => setLinkRole(e.target.value)}
                    className="rounded-md border border-slate-200 px-2 py-1"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role] || role}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={linkPrimary}
                      onChange={(e) => setLinkPrimary(e.target.checked)}
                    />
                    Primary
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleLinkProject}
                  className="rounded-md bg-[#0275ff] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0169e6]"
                >
                  Link project
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Create new project under this contact</h3>
              <div className="mt-3 space-y-2">
                <input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <select
                    value={newProjectRole}
                    onChange={(e) => setNewProjectRole(e.target.value)}
                    className="rounded-md border border-slate-200 px-2 py-1"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role] || role}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newProjectPrimary}
                      onChange={(e) => setNewProjectPrimary(e.target.checked)}
                    />
                    Primary
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleCreateProject}
                  className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Create project
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Create new transaction under this contact</h3>
              <div className="mt-3 space-y-2">
                <input
                  value={newTransactionAddress}
                  onChange={(e) => setNewTransactionAddress(e.target.value)}
                  placeholder="Transaction address"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <select
                    value={newTransactionRole}
                    onChange={(e) => setNewTransactionRole(e.target.value)}
                    className="rounded-md border border-slate-200 px-2 py-1"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role] || role}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newTransactionPrimary}
                      onChange={(e) => setNewTransactionPrimary(e.target.checked)}
                    />
                    Primary
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleCreateTransaction}
                  className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Create transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
