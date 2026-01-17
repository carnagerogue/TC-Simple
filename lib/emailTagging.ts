import { StakeholderRole } from "@prisma/client";

export type EmailRecipientRole =
  | "buyer_client"
  | "seller_client"
  | "buyer_agent"
  | "seller_agent"
  | "escrow"
  | "lender"
  | "title"
  | "inspector";

type EmailTagMeta = {
  role: EmailRecipientRole;
  label: string;
  className: string;
};

const EMAIL_ROLE_LABELS: Record<EmailRecipientRole, string> = {
  buyer_client: "Email: Buyer Client",
  seller_client: "Email: Seller Client",
  buyer_agent: "Email: Buyer Agent",
  seller_agent: "Email: Seller Agent",
  escrow: "Email: Escrow",
  lender: "Email: Lender",
  title: "Email: Title",
  inspector: "Email: Inspector",
};

const EMAIL_TAGS: Record<EmailRecipientRole, EmailTagMeta> = {
  buyer_client: {
    role: "buyer_client",
    label: EMAIL_ROLE_LABELS.buyer_client,
    className: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  },
  seller_client: {
    role: "seller_client",
    label: EMAIL_ROLE_LABELS.seller_client,
    className: "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200",
  },
  buyer_agent: {
    role: "buyer_agent",
    label: EMAIL_ROLE_LABELS.buyer_agent,
    className: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  seller_agent: {
    role: "seller_agent",
    label: EMAIL_ROLE_LABELS.seller_agent,
    className: "bg-sky-50 text-sky-700 border border-sky-200",
  },
  escrow: {
    role: "escrow",
    label: EMAIL_ROLE_LABELS.escrow,
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  lender: {
    role: "lender",
    label: EMAIL_ROLE_LABELS.lender,
    className: "bg-teal-50 text-teal-700 border border-teal-200",
  },
  title: {
    role: "title",
    label: EMAIL_ROLE_LABELS.title,
    className: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  },
  inspector: {
    role: "inspector",
    label: EMAIL_ROLE_LABELS.inspector,
    className: "bg-orange-50 text-orange-700 border border-orange-200",
  },
};

const EMAIL_ROLE_ALIASES: Record<string, EmailRecipientRole> = {
  buyer: "buyer_client",
  "buyer client": "buyer_client",
  buyer_client: "buyer_client",
  seller: "seller_client",
  "seller client": "seller_client",
  seller_client: "seller_client",
  "buyer agent": "buyer_agent",
  buyer_agent: "buyer_agent",
  "seller agent": "seller_agent",
  seller_agent: "seller_agent",
  escrow: "escrow",
  lender: "lender",
  title: "title",
  "title company": "title",
  title_company: "title",
  inspector: "inspector",
  inspection: "inspector",
};

export const EMAIL_TAG_SUGGESTIONS: Array<{ token: string; role: EmailRecipientRole }> = [
  { token: "email:buyer_client", role: "buyer_client" },
  { token: "email:seller_client", role: "seller_client" },
  { token: "email:buyer_agent", role: "buyer_agent" },
  { token: "email:seller_agent", role: "seller_agent" },
  { token: "email:escrow", role: "escrow" },
  { token: "email:lender", role: "lender" },
  { token: "email:title", role: "title" },
  { token: "email:inspector", role: "inspector" },
];

function normalizeToken(token: string) {
  return token.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeEmailRole(raw: string): EmailRecipientRole | null {
  const normalized = normalizeToken(raw).replace(/\s+/g, " ");
  const compact = normalized.replace(/\s+/g, "_");
  return EMAIL_ROLE_ALIASES[normalized] || EMAIL_ROLE_ALIASES[compact] || null;
}

export function extractEmailRolesFromTags(tags?: string | null): EmailRecipientRole[] {
  if (!tags) return [];
  const tokens = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const roles = new Set<EmailRecipientRole>();
  const hasEmailToken = tokens.some((t) => normalizeToken(t) === "email");

  tokens.forEach((token) => {
    const lower = normalizeToken(token);

    if (lower.startsWith("email:")) {
      const raw = lower.replace("email:", "");
      const role = normalizeEmailRole(raw);
      if (role) roles.add(role);
      return;
    }

    if (lower.startsWith("email to:")) {
      const raw = lower.replace("email to:", "");
      const role = normalizeEmailRole(raw);
      if (role) roles.add(role);
      return;
    }

    if (lower.startsWith("email to ")) {
      const raw = lower.replace("email to ", "");
      const role = normalizeEmailRole(raw);
      if (role) roles.add(role);
      return;
    }

    if (lower.startsWith("to:") && hasEmailToken) {
      const raw = lower.replace("to:", "");
      const role = normalizeEmailRole(raw);
      if (role) roles.add(role);
      return;
    }
  });

  return Array.from(roles);
}

export function getEmailTagMeta(role: EmailRecipientRole) {
  return EMAIL_TAGS[role];
}

export function emailRoleToStakeholder(role: EmailRecipientRole): StakeholderRole {
  switch (role) {
    case "buyer_client":
      return "BUYER";
    case "seller_client":
      return "SELLER";
    case "buyer_agent":
      return "BUYER_AGENT";
    case "seller_agent":
      return "SELLER_AGENT";
    case "escrow":
      return "ESCROW";
    case "lender":
      return "LENDER";
    case "title":
      return "TITLE";
    case "inspector":
      return "INSPECTOR";
    default:
      return "OTHER";
  }
}

export function emailRoleLabel(role: EmailRecipientRole) {
  return EMAIL_ROLE_LABELS[role] ?? role;
}
