"use client";

import { useEffect, useState } from "react";
import { ContactCategory, ContactRecord } from "./ContactCard";

const CATEGORY_OPTIONS: { label: string; value: ContactCategory }[] = [
  { label: "Agent", value: "AGENT" },
  { label: "Client", value: "CLIENT" },
  { label: "Escrow", value: "ESCROW" },
  { label: "Vendor", value: "VENDOR" },
  { label: "Lender", value: "LENDER" },
  { label: "Title", value: "TITLE" },
  { label: "Other", value: "OTHER" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<ContactRecord, "id"> & { id?: string }) => Promise<void>;
  initial?: ContactRecord | null;
};

export function AddContactModal({ open, onClose, onSave, initial }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<ContactCategory>("OTHER");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setFirstName(initial.firstName || "");
      setLastName(initial.lastName || "");
      setEmail(initial.email || "");
      setPhone(initial.phone || "");
      setCategory(initial.category || "OTHER");
      setCompany(initial.company || "");
      setRole(initial.role || "");
      setNotes(initial.notes || "");
    } else if (open) {
      // Reset to blank each time the modal is opened without an initial contact
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setCategory("OTHER");
      setCompany("");
      setRole("");
      setNotes("");
    }
  }, [initial, open]);

  if (!open) return null;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSave({
        id: initial?.id,
        firstName,
        lastName,
        email,
        phone,
        category,
        company,
        role,
        notes,
        source: initial?.source || "internal",
        avatarUrl: initial?.avatarUrl || null,
      });
      onClose();
    } catch (e: any) {
      setError(e?.message || "Unable to save contact");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            {initial ? "Edit Contact" : "Add Contact"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-2 py-1 text-slate-500 hover:bg-slate-50"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
              placeholder="First name"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Last name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
              placeholder="Last name"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
              placeholder="Email"
              type="email"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
              placeholder="Phone"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ContactCategory)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Company</label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
              placeholder="Company"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Role</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
              placeholder="Role"
            />
          </div>
          <div className="sm:col-span-2 flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
              placeholder="Notes"
            />
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="rounded-md bg-[#0275ff] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0169e6] disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Contact"}
          </button>
        </div>
      </div>
    </div>
  );
}
