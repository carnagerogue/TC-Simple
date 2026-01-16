"use client";

import { useEffect, useState } from "react";
import { ContactSkeleton } from "@/components/contacts/ContactSkeleton";
import { ContactCard, ContactRecord, ContactCategory } from "@/components/contacts/ContactCard";
import { AddContactModal } from "@/components/contacts/AddContactModal";
import { ContactHistoryModal } from "@/components/contacts/ContactHistoryModal";
import { signIn } from "next-auth/react";

type SortKey = "name" | "recent";

type ApiContact = ContactRecord & {
  id: string;
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ApiContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [googleConnected, setGoogleConnected] = useState(true);
  const [googleStatusLoading, setGoogleStatusLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ContactCategory | "ALL">("ALL");
  const [sort, setSort] = useState<SortKey>("recent");
  const [syncing, setSyncing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiContact | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyContactId, setHistoryContactId] = useState<string | null>(null);

  const fetchContacts = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category !== "ALL") params.set("category", category);
    params.set("sort", sort);
    try {
      const res = await fetch(`/api/contacts?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load contacts");
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch (e: any) {
      setError(e.message || "Unable to load contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, category]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/google/status", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to check Google status");
        const body = await res.json();
        if (body.status === "ok") {
          setGoogleConnected(true);
        } else if (body.status === "expired" || body.status === "missing") {
          setGoogleConnected(false);
        }
      } catch (_) {
        // if status fails, leave as-is
      } finally {
        setGoogleStatusLoading(false);
      }
    };
    checkStatus();
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      fetchContacts();
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleSave = async (payload: Omit<ContactRecord, "id"> & { id?: string }) => {
    const url = payload.id ? `/api/contacts/${payload.id}` : `/api/contacts`;
    const method = payload.id ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Failed to ${payload.id ? "update" : "create"} contact`);
    }
    await fetchContacts();
  };

  const handleDelete = async (contact: ApiContact) => {
    if (!confirm(`Delete ${contact.firstName}?`)) return;
    const res = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Unable to delete contact");
    }
    await fetchContacts();
  };

  const filtered = contacts.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      `${c.firstName} ${c.lastName || ""}`.toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.company || "").toLowerCase().includes(q) ||
      (c.role || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Contacts</p>
            <h1 className="text-3xl font-semibold text-slate-900">Integrated contact list</h1>
            <p className="text-sm text-slate-500">Search, filter, and manage all contacts.</p>
            <a href="/email-templates" className="text-xs font-semibold text-[#1b4c96] hover:underline">
              Manage Templates
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts..."
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ContactCategory | "ALL")}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
            >
              <option value="ALL">All categories</option>
              <option value="AGENT">Agent</option>
              <option value="CLIENT">Client</option>
              <option value="ESCROW">Escrow</option>
              <option value="VENDOR">Vendor</option>
              <option value="LENDER">Lender</option>
              <option value="TITLE">Title</option>
              <option value="OTHER">Other</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
            >
              <option value="name">Name A–Z</option>
              <option value="recent">Recently added</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              className="rounded-lg bg-[#0275ff] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0169e6]"
            >
              Add Contact
            </button>
            <button
              type="button"
              disabled={syncing}
              onClick={async () => {
                setSyncing(true);
                setError(null);
                setSyncMessage(null);
                try {
                  const res = await fetch("/api/contacts/sync-gmail", { cache: "no-store" });
                  if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    const errMsg =
                      body.error || "Google permissions expired. Please reconnect your Google account.";
                    if (errMsg.toLowerCase().includes("no google oauth token")) {
                      setGoogleConnected(false);
                    }
                    throw new Error(errMsg);
                  }
                  setGoogleConnected(true);
                  const body = await res.json().catch(() => ({}));
                  await fetchContacts();
                  setSyncMessage(
                    `Gmail contacts synced successfully. Fetched ${body.fetched ?? body.synced ?? 0}, created ${body.created ?? 0}, updated ${body.updated ?? 0}.`
                  );
                } catch (e: any) {
                  setError(e.message || "Unable to sync Gmail contacts");
                } finally {
                  setSyncing(false);
                }
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              {syncing ? "Syncing..." : "Sync Gmail"}
            </button>
          </div>
        </div>

      {!googleStatusLoading && !googleConnected ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Google connection expired — click here to reconnect.
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/contacts" })}
            className="ml-2 font-semibold underline"
          >
            Reconnect now →
          </button>
        </div>
      ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}
        {syncMessage ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {syncMessage}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <ContactSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
              No contacts found.
            </div>
          ) : (
            filtered.map((c) => (
              <ContactCard
                key={c.id}
                contact={c}
                onEdit={(contact) => {
                  setEditing(contact);
                  setModalOpen(true);
                }}
                onDelete={(contact) => {
                  handleDelete(contact).catch((err) => setError(err.message));
                }}
                onView={(contact) => {
                  setEditing(contact);
                  setModalOpen(true);
                }}
                onHistory={(contact) => {
                  setHistoryContactId(contact.id);
                  setHistoryOpen(true);
                }}
              />
            ))
          )}
        </div>
      </div>

      <AddContactModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editing}
        onSave={async (data) => {
          await handleSave({
            ...data,
            firstName: data.firstName.trim(),
            lastName: (data.lastName || "").trim(),
          });
          setEditing(null);
        }}
      />
      <ContactHistoryModal
        open={historyOpen}
        contactId={historyContactId}
        onClose={() => {
          setHistoryOpen(false);
          setHistoryContactId(null);
        }}
      />
    </div>
  );
}
