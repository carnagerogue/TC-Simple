import { StakeholderRole } from "@prisma/client";

/**
 * Extract the target role from a comma-delimited tags string.
 * Returns lowercase role keys such as "buyer", "seller_agent", "lender", etc.
 */
export function extractRoleFromTags(tags?: string | null): string | null {
  if (!tags) return null;
  const parts = tags
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  const match = parts.find((p) => p.startsWith("to:"));
  if (!match) return null;
  const role = match.replace("to:", "");
  return role || null;
}

export function tagsIncludeEmail(tags?: string | null) {
  if (!tags) return false;
  return tags
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .includes("email");
}

export function normalizeRoleToStakeholder(role?: string | null): StakeholderRole | null {
  if (!role) return null;
  const upper = role.toUpperCase();
  switch (upper) {
    case "BUYER":
      return "BUYER";
    case "SELLER":
      return "SELLER";
    case "BUYER_AGENT":
    case "BUYER-AGENT":
    case "BUYERAGENT":
      return "BUYER_AGENT";
    case "SELLER_AGENT":
    case "SELLER-AGENT":
    case "SELLERAGENT":
      return "SELLER_AGENT";
    case "LENDER":
      return "LENDER";
    case "ESCROW":
    case "ESCROW_OFFICER":
    case "ESCROW-OFFICER":
      return "ESCROW";
    default:
      return null;
  }
}

type ContactLike = { firstName?: string | null; lastName?: string | null; email?: string | null; phone?: string | null };
type StakeholderLike = { role: StakeholderRole; contact: ContactLike };
type ProjectLike = { summary?: Record<string, any> | null; myClientRole?: StakeholderRole | "BUYER" | "SELLER" | null };

export function renderTemplate(template: string, project: ProjectLike, stakeholders: StakeholderLike[]) {
  const map = new Map<StakeholderRole, ContactLike>();
  stakeholders.forEach((s) => {
    if (!map.has(s.role)) map.set(s.role, s.contact);
  });
  const getName = (role?: StakeholderRole | "BUYER" | "SELLER" | null) => {
    if (!role) return "";
    const contact = map.get(role as StakeholderRole);
    return [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") || "";
  };
  const getEmail = (role?: StakeholderRole | null) => (role ? map.get(role)?.email || "" : "");
  const getPhone = (role?: StakeholderRole | null) => (role ? map.get(role)?.phone || "" : "");
  const address =
    project.summary?.["property_address"] ||
    project.summary?.["address"] ||
    [project.summary?.["property_city"], project.summary?.["property_state"], project.summary?.["property_zip"]]
      .filter(Boolean)
      .join(", ");

  return template
    .replaceAll("{buyerName}", getName("BUYER"))
    .replaceAll("{sellerName}", getName("SELLER"))
    .replaceAll("{buyerAgentName}", getName("BUYER_AGENT"))
    .replaceAll("{sellerAgentName}", getName("SELLER_AGENT"))
    .replaceAll("{escrowEmail}", getEmail("ESCROW"))
    .replaceAll("{lenderPhone}", getPhone("LENDER"))
    .replaceAll("{myClientName}", getName(project.myClientRole as any))
    .replaceAll("{propertyAddress}", address || "");
}

