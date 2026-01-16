import { ContactAvatar } from "@/components/contacts/ContactAvatar";

export type ContactCategory =
  | "AGENT"
  | "CLIENT"
  | "ESCROW"
  | "VENDOR"
  | "LENDER"
  | "TITLE"
  | "OTHER";

export type ContactRecord = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  category: ContactCategory;
  company?: string | null;
  role?: string | null;
  notes?: string | null;
  source?: string | null;
  avatarUrl?: string | null;
};

type Props = {
  contact: ContactRecord;
  onEdit?: (contact: ContactRecord) => void;
  onDelete?: (contact: ContactRecord) => void;
  onView?: (contact: ContactRecord) => void;
  onHistory?: (contact: ContactRecord) => void;
};

const CATEGORY_COLORS: Record<ContactCategory, string> = {
  AGENT: "bg-indigo-50 text-indigo-700",
  CLIENT: "bg-emerald-50 text-emerald-700",
  ESCROW: "bg-amber-50 text-amber-700",
  VENDOR: "bg-sky-50 text-sky-700",
  LENDER: "bg-purple-50 text-purple-700",
  TITLE: "bg-blue-50 text-blue-700",
  OTHER: "bg-slate-100 text-slate-700",
};

export function ContactCard({ contact, onEdit, onDelete, onView, onHistory }: Props) {
  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  const categoryClass = CATEGORY_COLORS[contact.category] ?? CATEGORY_COLORS.OTHER;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#9bc4ff]">
      <div className="flex items-start gap-3">
        <ContactAvatar name={fullName || "Unnamed"} photoUrl={contact.avatarUrl ?? undefined} />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">{fullName || "Unnamed"}</p>
              {contact.company ? (
                <p className="text-xs text-slate-500">{contact.company}</p>
              ) : contact.role ? (
                <p className="text-xs text-slate-500">{contact.role}</p>
              ) : null}
            </div>
            <div className={`rounded-full px-3 py-1 text-[11px] font-semibold ${categoryClass}`}>
              {contact.category.toLowerCase()}
            </div>
          </div>
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
            {contact.source ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {contact.source === "gmail" ? "Gmail" : "Internal"}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 text-xs">
        <button
          type="button"
          onClick={() => onHistory?.(contact)}
          className="rounded-md border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50"
        >
          History
        </button>
        <button
          type="button"
          onClick={() => onView?.(contact)}
          className="rounded-md border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50"
        >
          View
        </button>
        <button
          type="button"
          onClick={() => onEdit?.(contact)}
          className="rounded-md border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete?.(contact)}
          className="rounded-md border border-red-200 px-3 py-1 font-semibold text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
