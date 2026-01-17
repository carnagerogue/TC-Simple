"use client";

import { useCallback, useEffect, useState } from "react";

type LinkedContact = {
  id: string;
  role: string;
  contact: {
    id: string;
    firstName: string;
    lastName?: string | null;
    email?: string | null;
    category: string;
  };
};

type ContactOption = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  category: string;
};

type Props = {
  projectId: string;
};

const ROLE_LABELS: Record<string, string> = {
  BUYER: "Buyer",
  SELLER: "Seller",
  BUYER_AGENT: "Buyer Agent",
  SELLER_AGENT: "Seller Agent",
  ESCROW: "Escrow",
  INSPECTOR: "Inspector",
  VENDOR: "Vendor",
  LENDER: "Lender",
  TITLE: "Title",
  OTHER: "Other",
};

const ROLE_OPTIONS = Object.keys(ROLE_LABELS);

export function ProjectLinkedContactsPanel({ projectId }: Props) {
  const [links, setLinks] = useState<LinkedContact[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [role, setRole] = useState("BUYER");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadLinks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/stakeholders`, { cache: "no-store" });
      if (!res.ok) throw new Error("Unable to load linked contacts");
      const body = (await res.json()) as { stakeholders?: LinkedContact[] };
      setLinks(body.stakeholders || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to load linked contacts");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts?sort=name", { cache: "no-store" });
      if (!res.ok) return;
      const body = (await res.json()) as { contacts?: ContactOption[] };
      setContacts(body.contacts || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadLinks();
    loadContacts();
  }, [loadLinks, loadContacts]);

  const handleAdd = async () => {
    if (!selectedContactId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/stakeholders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: selectedContactId, role }),
      });
      if (!res.ok) throw new Error("Unable to link contact");
      setSelectedContactId("");
      await loadLinks();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to link contact");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (contactId: string, roleValue: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/stakeholders`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, role: roleValue }),
      });
      if (!res.ok) throw new Error("Unable to unlink contact");
      await loadLinks();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to unlink contact");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Linked contacts</p>
          <h3 className="text-lg font-semibold text-slate-900">Project links</h3>
        </div>
        {loading ? <span className="text-xs text-slate-400">Loading…</span> : null}
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        {links.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            No linked contacts yet.
          </div>
        ) : (
          links.map((link) => (
            <div
              key={`${link.contact.id}-${link.role}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              <div>
                <p className="font-semibold text-slate-900">
                  {link.contact.firstName} {link.contact.lastName || ""}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {ROLE_LABELS[link.role] || link.role}
                  {link.contact.email ? ` · ${link.contact.email}` : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleRemove(link.contact.id, link.role)}
                className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Add link</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={selectedContactId}
            onChange={(e) => setSelectedContactId(e.target.value)}
            className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs"
          >
            <option value="">Select contact</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName || ""}
              </option>
            ))}
          </select>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {ROLE_LABELS[opt] || opt}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={busy || !selectedContactId}
            className="rounded-md bg-[#0275ff] px-3 py-1 text-xs font-semibold text-white hover:bg-[#0169e6] disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
