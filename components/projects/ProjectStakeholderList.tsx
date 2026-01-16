"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ContactAvatar } from "@/components/contacts/ContactAvatar";

export type Stakeholder = {
  id: string;
  role: string;
  totalTransactions?: number;
  contact: {
    id: string;
    firstName: string;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    category: string;
    company?: string | null;
    role?: string | null;
    source?: string | null;
    avatarUrl?: string | null;
  };
};

const ROLE_LABELS: Record<string, string> = {
  BUYER: "Buyer",
  SELLER: "Seller",
  BUYER_AGENT: "Buyer Agent",
  SELLER_AGENT: "Seller Agent",
  ESCROW: "Escrow",
  VENDOR: "Vendor",
  LENDER: "Lender",
  TITLE: "Title",
  OTHER: "Other",
};

const ROLE_OPTIONS = Object.keys(ROLE_LABELS);

const CATEGORY_COLORS: Record<string, string> = {
  AGENT: "bg-indigo-50 text-indigo-700",
  CLIENT: "bg-emerald-50 text-emerald-700",
  ESCROW: "bg-amber-50 text-amber-700",
  VENDOR: "bg-sky-50 text-sky-700",
  LENDER: "bg-purple-50 text-purple-700",
  TITLE: "bg-blue-50 text-blue-700",
  OTHER: "bg-slate-100 text-slate-700",
};

function badgeClass(category: string) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.OTHER;
}

type ContactOption = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  category: string;
  company?: string | null;
  role?: string | null;
  source?: string | null;
  avatarUrl?: string | null;
};

type Props = {
  projectId: string;
  myClientRole?: string | null;
  refreshKey?: number;
  forceOpenModal?: boolean;
  onModalSettled?: () => void;
  onClientRoleChange?: (role: "BUYER" | "SELLER") => void;
};

export function ProjectStakeholderList({
  projectId,
  myClientRole,
  refreshKey,
  forceOpenModal,
  onModalSettled,
  onClientRoleChange,
}: Props) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string>("BUYER");
  const [newContact, setNewContact] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    category: "CLIENT",
    company: "",
    roleTitle: "",
  });
  const [busy, setBusy] = useState(false);
  const [clientRole, setClientRole] = useState<string | null>(myClientRole ?? null);

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      [c.firstName, c.lastName, c.email, c.phone, c.company, c.role]
        .filter(Boolean)
        .some((f) => (f || "").toLowerCase().includes(q))
    );
  }, [contacts, search]);

  const groupedStakeholders = useMemo(() => {
    const map = new Map<
      string,
      { contact: Stakeholder["contact"]; roles: string[]; totalTransactions: number }
    >();
    for (const s of stakeholders) {
      const key = s.contact.id;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          contact: s.contact,
          roles: [s.role],
          totalTransactions: s.totalTransactions || 1,
        });
      } else {
        if (!existing.roles.includes(s.role)) existing.roles.push(s.role);
        existing.totalTransactions = Math.max(existing.totalTransactions, s.totalTransactions || 1);
      }
    }

    const roleOrder = ROLE_OPTIONS;
    const groups = Array.from(map.values()).map((g) => ({
      ...g,
      roles: g.roles.sort((a, b) => roleOrder.indexOf(a) - roleOrder.indexOf(b)),
    }));

    groups.sort((a, b) => {
      const an = `${a.contact.firstName} ${a.contact.lastName || ""}`.trim().toLowerCase();
      const bn = `${b.contact.firstName} ${b.contact.lastName || ""}`.trim().toLowerCase();
      return an.localeCompare(bn);
    });

    return groups;
  }, [stakeholders]);

  const loadStakeholders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/stakeholders`, { cache: "no-store", credentials: "include" });
      if (!res.ok) throw new Error("Failed to load stakeholders");
      const data = (await res.json()) as { stakeholders?: Stakeholder[]; myClientRole?: string | null };
      setStakeholders(data.stakeholders || []);
      setClientRole(data.myClientRole ?? null);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Unable to load stakeholders";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadContacts = useCallback(async () => {
    try {
      const res = await fetch(`/api/contacts?sort=name`, { cache: "no-store", credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as { contacts?: ContactOption[] };
        setContacts(data.contacts || []);
      }
    } catch (_) { /* ignore */ }
  }, []);

  useEffect(() => {
    setClientRole(myClientRole ?? null);
  }, [myClientRole]);

  useEffect(() => {
    loadStakeholders();
    loadContacts();
  }, [loadStakeholders, loadContacts, refreshKey]);

  useEffect(() => {
    if (forceOpenModal) {
      setModalOpen(true);
      onModalSettled?.();
    }
  }, [forceOpenModal, onModalSettled]);

  const attachContact = async (contactId: string, roleValue: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/stakeholders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contactId, role: roleValue }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to add stakeholder");
      }
      await loadStakeholders();
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Unable to add stakeholder";
      setError(errorMsg);
    } finally {
      setBusy(false);
    }
  };

  const createAndAttach = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/stakeholders/add-contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...newContact, role }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to add contact");
      }
      await loadContacts();
      await loadStakeholders();
      setNewContact({ firstName: "", lastName: "", email: "", phone: "", category: "CLIENT", company: "", roleTitle: "" });
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Unable to add contact";
      setError(errorMsg);
    } finally {
      setBusy(false);
    }
  };

  const assignAsClient = async (contactId: string, roleValue: "BUYER" | "SELLER") => {
    setBusy(true);
    setError(null);
    try {
      await attachContact(contactId, roleValue);
      const res = await fetch(`/api/projects/${projectId}/my-client`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: roleValue }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unable to set client role");
      setClientRole(data.myClientRole ?? roleValue);
      onClientRoleChange?.((data.myClientRole ?? roleValue) as "BUYER" | "SELLER");
      await loadStakeholders();
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Unable to assign client";
      setError(errorMsg);
    } finally {
      setBusy(false);
    }
  };

  const removeStakeholder = async (contactId: string, roleValue: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/stakeholders`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contactId, role: roleValue }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to remove");
      }
      setStakeholders((prev) => prev.filter((s) => !(s.contact.id === contactId && s.role === roleValue)));
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Unable to remove";
      setError(errorMsg);
    } finally {
      setBusy(false);
    }
  };

  const removeContactFromProject = async (contactId: string, rolesToRemove: string[]) => {
    setBusy(true);
    setError(null);
    try {
      for (const roleValue of rolesToRemove) {
        await fetch(`/api/projects/${projectId}/stakeholders`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ contactId, role: roleValue }),
        });
      }
      setStakeholders((prev) => prev.filter((s) => s.contact.id !== contactId));
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Unable to remove";
      setError(errorMsg);
    } finally {
      setBusy(false);
    }
  };

  const toggleRole = async (contactId: string, roleValue: string, active: boolean) => {
    if (active) { await removeStakeholder(contactId, roleValue); } 
    else { await attachContact(contactId, roleValue); }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Stakeholders</p>
          <h3 className="text-lg font-semibold text-slate-900">Project stakeholders</h3>
          <p className="text-xs text-slate-500 mt-1">Assign parties and representation roles per contact.</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-[#0275ff] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0169e6]"
        >
          Add stakeholder
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : groupedStakeholders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">No stakeholders yet.</div>
        ) : (
          groupedStakeholders.map((g) => {
            const name = [g.contact.firstName, g.contact.lastName].filter(Boolean).join(" ");
            const rolesSet = new Set(g.roles);
            const isExpanded = expandedContactId === g.contact.id;
            return (
              <div key={g.contact.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex flex-1 items-start gap-3">
                    {/* Senior Fix: Removed invalid 'size' prop causing the build error */}
                    <ContactAvatar name={name || "Unnamed"} photoUrl={g.contact.avatarUrl || undefined} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{name || "Unnamed"}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        {g.contact.email && <span>{g.contact.email}</span>}
                        {g.contact.phone && <span>{g.contact.phone}</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                        <span className={`rounded-full px-2 py-0.5 ${badgeClass(g.contact.category)}`}>{g.contact.category.toLowerCase()}</span>
                        {g.roles.map((r) => (
                          <span key={r} className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{ROLE_LABELS[r] || r.toLowerCase()}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="max-w-full rounded-xl bg-slate-100 px-3 py-1.5 text-[11px] leading-snug text-slate-600">Worked together: {g.totalTransactions || 1} txn</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setExpandedContactId(cur => cur === g.contact.id ? null : g.contact.id)} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                        {isExpanded ? "Done" : "Manage"}
                      </button>
                      <button type="button" onClick={() => removeContactFromProject(g.contact.id, g.roles)} className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-600">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Party</p>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => toggleRole(g.contact.id, "BUYER", rolesSet.has("BUYER"))} className={`rounded-full border px-3 py-1 text-xs font-semibold ${rolesSet.has("BUYER") ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}>Buyer</button>
                          <button type="button" onClick={() => toggleRole(g.contact.id, "SELLER", rolesSet.has("SELLER"))} className={`rounded-full border px-3 py-1 text-xs font-semibold ${rolesSet.has("SELLER") ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}>Seller</button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Representation</p>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => toggleRole(g.contact.id, "BUYER_AGENT", rolesSet.has("BUYER_AGENT"))} className={`rounded-full border px-3 py-1 text-xs font-semibold ${rolesSet.has("BUYER_AGENT") ? "border-[#0275ff] bg-[#eaf2ff] text-[#1b4c96]" : "border-slate-200 bg-white text-slate-700"}`}>Buyer side</button>
                          <button type="button" onClick={() => toggleRole(g.contact.id, "SELLER_AGENT", rolesSet.has("SELLER_AGENT"))} className={`rounded-full border px-3 py-1 text-xs font-semibold ${rolesSet.has("SELLER_AGENT") ? "border-[#0275ff] bg-[#eaf2ff] text-[#1b4c96]" : "border-slate-200 bg-white text-slate-700"}`}>Seller side</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-slate-900">Attach a contact</h4>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-600">✕</button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <select value={role} onChange={e => setRole(e.target.value)} className="rounded-lg border p-2 text-sm">
                {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts" className="flex-1 rounded-lg border p-2 text-sm" />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredContacts.map(c => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border p-2">
                    <span className="text-sm">{c.firstName} {c.lastName}</span>
                    <button type="button" onClick={() => attachContact(c.id, role)} className="rounded bg-[#0275ff] px-2 py-1 text-xs text-white">Select</button>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <input value={newContact.firstName} onChange={e => setNewContact(p => ({ ...p, firstName: e.target.value }))} placeholder="First Name" className="w-full rounded border p-2 text-sm" />
                <input value={newContact.lastName} onChange={e => setNewContact(p => ({ ...p, lastName: e.target.value }))} placeholder="Last Name" className="w-full rounded border p-2 text-sm" />
                <button type="button" onClick={createAndAttach} className="w-full rounded bg-emerald-500 p-2 text-xs text-white">Add and attach</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}