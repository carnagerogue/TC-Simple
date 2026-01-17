export type TaskTag = {
  id: string;
  label: string;
  className: string;
};

const TAG_DEFS: Record<string, TaskTag> = {
  buyer_client: { id: "buyer_client", label: "Buyer Client", className: "bg-emerald-50 text-emerald-700" },
  seller_client: { id: "seller_client", label: "Seller Client", className: "bg-purple-50 text-purple-700" },
  buyer_agent: { id: "buyer_agent", label: "Buyer Agent", className: "bg-blue-50 text-blue-700" },
  seller_agent: { id: "seller_agent", label: "Seller Agent", className: "bg-indigo-50 text-indigo-700" },
  escrow: { id: "escrow", label: "Escrow", className: "bg-amber-50 text-amber-700" },
  title: { id: "title", label: "Title", className: "bg-sky-50 text-sky-700" },
  lender: { id: "lender", label: "Lender", className: "bg-teal-50 text-teal-700" },
  inspector: { id: "inspector", label: "Inspector", className: "bg-orange-50 text-orange-700" },
  appraiser: { id: "appraiser", label: "Appraiser", className: "bg-pink-50 text-pink-700" },
  attorney: { id: "attorney", label: "Attorney", className: "bg-slate-100 text-slate-700" },
  hoa: { id: "hoa", label: "HOA", className: "bg-lime-50 text-lime-700" },
  vendor: { id: "vendor", label: "Vendor", className: "bg-zinc-100 text-zinc-700" },
  compliance: { id: "compliance", label: "Compliance", className: "bg-cyan-50 text-cyan-700" },
  finance: { id: "finance", label: "Finance", className: "bg-rose-50 text-rose-700" },
  closing: { id: "closing", label: "Closing", className: "bg-violet-50 text-violet-700" },
  contract: { id: "contract", label: "Contract", className: "bg-stone-100 text-stone-700" },
  review: { id: "review", label: "Review", className: "bg-blue-100 text-blue-800" },
  confirm: { id: "confirm", label: "Confirm", className: "bg-emerald-100 text-emerald-800" },
  request: { id: "request", label: "Request", className: "bg-yellow-50 text-yellow-700" },
  reminder: { id: "reminder", label: "Reminder", className: "bg-fuchsia-50 text-fuchsia-700" },
  coordinate: { id: "coordinate", label: "Coordinate", className: "bg-lime-100 text-lime-800" },
  send: { id: "send", label: "Send", className: "bg-sky-100 text-sky-800" },
  followup: { id: "followup", label: "Follow-up", className: "bg-rose-100 text-rose-800" },
};

const TAG_ALIASES: Record<string, string> = {
  buyer: "buyer_client",
  seller: "seller_client",
  buyer_client: "buyer_client",
  seller_client: "seller_client",
  "buyer agent": "buyer_agent",
  "seller agent": "seller_agent",
  buyer_agent: "buyer_agent",
  seller_agent: "seller_agent",
  escrow: "escrow",
  title: "title",
  "title company": "title",
  title_company: "title",
  lender: "lender",
  inspector: "inspector",
  inspection: "inspector",
  appraiser: "appraiser",
  attorney: "attorney",
  hoa: "hoa",
  vendor: "vendor",
  compliance: "compliance",
  finance: "finance",
  closing: "closing",
  contract: "contract",
  document: "contract",
  review: "review",
  confirm: "confirm",
  request: "request",
  reminder: "reminder",
  coordinate: "coordinate",
  send: "send",
  followup: "followup",
};

const ROLE_TAG_BY_TO: Record<string, string> = {
  buyer: "buyer_client",
  seller: "seller_client",
  buyer_agent: "buyer_agent",
  seller_agent: "seller_agent",
  escrow: "escrow",
  title: "title",
  title_company: "title",
  lender: "lender",
  inspector: "inspector",
  appraiser: "appraiser",
  attorney: "attorney",
  hoa: "hoa",
};

const TAG_BLOCKLIST = new Set(["ai", "email", "no-email"]);

function normalizeToken(token: string) {
  return token.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveTagId(token: string): string | null {
  if (!token) return null;
  const raw = normalizeToken(token);
  if (TAG_BLOCKLIST.has(raw)) return null;

  if (raw.startsWith("to:")) {
    const target = normalizeToken(raw.slice(3)).replace(/\s+/g, "_");
    return ROLE_TAG_BY_TO[target] ?? null;
  }

  const normalized = raw.replace(/\s+/g, "_");
  if (TAG_ALIASES[raw]) return TAG_ALIASES[raw];
  if (TAG_ALIASES[normalized]) return TAG_ALIASES[normalized];
  if (TAG_DEFS[normalized]) return normalized;
  return null;
}

export function getTaskTags(tags?: string | null): TaskTag[] {
  if (!tags) return [];
  const tokens = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const ids = new Set<string>();
  tokens.forEach((token) => {
    const id = resolveTagId(token);
    if (id) ids.add(id);
  });

  return Array.from(ids).map((id) => TAG_DEFS[id]).filter(Boolean);
}

export const TASK_TAG_SUGGESTIONS = [
  "buyer_client",
  "seller_client",
  "buyer_agent",
  "seller_agent",
  "escrow",
  "title",
  "lender",
  "inspector",
  "appraiser",
  "attorney",
  "hoa",
  "vendor",
  "closing",
  "finance",
  "compliance",
  "contract",
  "request",
  "review",
  "confirm",
  "reminder",
  "coordinate",
  "send",
  "followup",
];

export function getTagLabel(tagId: string) {
  return TAG_DEFS[tagId]?.label ?? tagId;
}
