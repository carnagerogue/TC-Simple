const ALLOWED_PLACEHOLDERS = [
  "buyerName",
  "buyerEmail",
  "buyerAgentName",
  "buyerAgentPhone",
  "buyerAgentEmail",
  "sellerName",
  "sellerAgentName",
  "sellerAgentPhone",
  "sellerAgentEmail",
  "escrowEmail",
  "escrowName",
  "escrowPhone",
  "lenderCompany",
  "lenderName",
  "lenderEmail",
  "lenderPhone",
  "agentName",
  "agentPhone",
  "agentEmail",
  "propertyAddress",
  "closingDate",
  "contractDate",
  "myClientName",
];

export function validatePlaceholders(text: string) {
  const regex = /\{([^}]+)\}/g;
  const unknown: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const key = match[1];
    if (!ALLOWED_PLACEHOLDERS.includes(key)) {
      unknown.push(key);
    }
  }
  return { unknown };
}

export function parseTags(tags?: string | null): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function tagsToString(tags: string[] | undefined | null) {
  if (!tags || tags.length === 0) return null;
  return tags.join(", ");
}

export function filterTemplatesByCategory(
  category: string | undefined,
  requested: string | undefined | null,
) {
  if (!requested) return true;
  return (category || "").toUpperCase() === requested.toUpperCase();
}

export function renderTemplate(
  template: string,
  project: { summary?: Record<string, string | number | null | undefined> | null; myClientRole?: string | null },
  stakeholders: Array<{
    role: string;
    contact: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      phone?: string | null;
      company?: string | null;
      category?: string | null;
    };
  }>,
) {
  const map = new Map<string, (typeof stakeholders)[number]["contact"]>();
  stakeholders.forEach((s) => {
    if (!map.has(s.role)) map.set(s.role, s.contact);
  });
  const byCategory = (category: string) =>
    stakeholders.find(
      (s) =>
        (s.role || "").toUpperCase() === category ||
        (s.contact?.category || "").toUpperCase() === category,
    )?.contact;
  const getByRoleOrCategory = (role: string, category?: string) => map.get(role) || (category ? byCategory(category) : null);

  const summary = project.summary || {};
  const getName = (role?: string | null) => {
    if (!role) return "";
    const contact = map.get(role);
    return [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") || "";
  };
  const getEmail = (role?: string | null) => (role ? map.get(role)?.email || "" : "");
  const getPhone = (role?: string | null) => (role ? map.get(role)?.phone || "" : "");
  const getCompany = (role?: string | null) => (role ? map.get(role)?.company || "" : "");
  const address =
    summary["property_address"] ||
    [summary["property_city"], summary["property_state"], summary["property_zip"]].filter(Boolean).join(", ");
  const replacements: Record<string, string> = {
    buyerName: getName("BUYER"),
    buyerEmail: getEmail("BUYER"),
    buyerAgentName: getName("BUYER_AGENT"),
    buyerAgentPhone: getPhone("BUYER_AGENT"),
    buyerAgentEmail: getEmail("BUYER_AGENT"),
    sellerName: getName("SELLER"),
    sellerAgentName: getName("SELLER_AGENT"),
    sellerAgentPhone: getPhone("SELLER_AGENT"),
    sellerAgentEmail: getEmail("SELLER_AGENT"),
    escrowEmail: getEmail("ESCROW"),
    escrowName: getName("ESCROW"),
    escrowPhone: getPhone("ESCROW"),
    lenderCompany: getCompany("LENDER"),
    lenderName: getName("LENDER"),
    lenderEmail: getEmail("LENDER"),
    lenderPhone: getPhone("LENDER"),
    agentName:
      getName("BUYER_AGENT") ||
      getName("SELLER_AGENT") ||
      [getByRoleOrCategory("AGENT", "AGENT")?.firstName, getByRoleOrCategory("AGENT", "AGENT")?.lastName]
        .filter(Boolean)
        .join(" "),
    agentPhone:
      getPhone("BUYER_AGENT") ||
      getPhone("SELLER_AGENT") ||
      getByRoleOrCategory("AGENT", "AGENT")?.phone ||
      "",
    agentEmail:
      getEmail("BUYER_AGENT") ||
      getEmail("SELLER_AGENT") ||
      getByRoleOrCategory("AGENT", "AGENT")?.email ||
      "",
    propertyAddress: address || "",
    closingDate: summary["closing_date"] || "",
    contractDate: summary["contract_date"] || "",
    myClientName: getName(project.myClientRole ?? null),
  };
  return template.replace(/\{([^}]+)\}/g, (_, key) => replacements[key] ?? "");
}

export { ALLOWED_PLACEHOLDERS };

