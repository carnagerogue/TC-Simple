import type {
  ContingencyProvision,
  ExtractedProvisions,
  FinancingProvision,
  FeasibilityProvision,
  PromissoryNoteProvision,
} from "./provisionsTypes";

const DATE_REGEXES = [
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
  /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi,
];

const DAYS_REGEX = /(\d{1,3})\s*(?:calendar\s*)?days?/i;
const AMOUNT_REGEX = /\$[\d,]+(?:\.\d{2})?/;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim();

const findFirstKeyword = (textLower: string, keywords: string[]) => {
  for (const keyword of keywords) {
    const idx = textLower.indexOf(keyword);
    if (idx !== -1) return { idx, keyword };
  }
  return null;
};

const snippetForIndex = (text: string, idx: number, radius = 140) => {
  const start = clamp(idx - radius, 0, text.length);
  const end = clamp(idx + radius, 0, text.length);
  return normalizeText(text.slice(start, end));
};

const extractAmount = (snippet: string) => {
  const match = snippet.match(AMOUNT_REGEX);
  if (!match) return undefined;
  const normalized = match[0].replace(/[$,]/g, "");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
};

const extractDate = (snippet: string) => {
  for (const regex of DATE_REGEXES) {
    const match = snippet.match(regex);
    if (match?.length) return match[0];
  }
  return undefined;
};

const extractDays = (snippet: string) => {
  const match = snippet.match(DAYS_REGEX);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
};

const inferParty = (snippetLower: string, token: string, fallback: string) =>
  snippetLower.includes(token) ? fallback : undefined;

const buildPromissoryNote = (text: string): PromissoryNoteProvision => {
  const lower = text.toLowerCase();
  const match = findFirstKeyword(lower, ["promissory note", "seller financing", "promissory", "deferred", "payable"]);
  if (!match) {
    return { exists: false };
  }
  const quote = snippetForIndex(text, match.idx);
  const quoteLower = quote.toLowerCase();
  return {
    exists: true,
    amount: extractAmount(quote),
    dueDate: extractDate(quote),
    payer: inferParty(quoteLower, "buyer", "Buyer"),
    payee: inferParty(quoteLower, "seller", "Seller"),
    notes: `Detected "${match.keyword}" language.`,
    source: { quote },
  };
};

const buildFeasibility = (text: string): FeasibilityProvision => {
  const lower = text.toLowerCase();
  const match = findFirstKeyword(lower, [
    "feasibility contingency",
    "feasibility period",
    "feasibility",
    "inspection period",
    "days after mutual acceptance",
  ]);
  if (!match) {
    return { exists: false };
  }
  const quote = snippetForIndex(text, match.idx);
  const quoteLower = quote.toLowerCase();
  return {
    exists: true,
    periodDays: extractDays(quote),
    expirationDate: extractDate(quote),
    requiresNotice: quoteLower.includes("notice"),
    notes: `Detected "${match.keyword}" language.`,
    source: { quote },
  };
};

const buildFinancing = (text: string): FinancingProvision | undefined => {
  const lower = text.toLowerCase();
  const match = findFirstKeyword(lower, ["financing", "loan approval", "commitment", "mortgage"]);
  if (!match) return undefined;
  const quote = snippetForIndex(text, match.idx);
  const quoteLower = quote.toLowerCase();
  const type = quoteLower.includes("commitment")
    ? "Loan commitment"
    : quoteLower.includes("approval")
    ? "Loan approval"
    : quoteLower.includes("mortgage")
    ? "Mortgage financing"
    : "Financing";
  return {
    type,
    deadline: extractDate(quote) ?? (extractDays(quote) ? `${extractDays(quote)} days` : undefined),
    notes: `Detected "${match.keyword}" language.`,
    source: { quote },
  };
};

const buildContingencies = (text: string): ContingencyProvision[] => {
  const lower = text.toLowerCase();
  const definitions = [
    { type: "Inspection", keywords: ["inspection contingency", "inspection period", "inspection"] },
    { type: "Appraisal", keywords: ["appraisal", "appraisal contingency"] },
    { type: "Title", keywords: ["title contingency", "title review", "title"] },
    { type: "HOA Review", keywords: ["hoa", "homeowners association"] },
    { type: "Survey", keywords: ["survey contingency", "survey"] },
    { type: "Sale of Other Property", keywords: ["sale of other property", "buyer sale"] },
  ];

  const results: ContingencyProvision[] = [];
  definitions.forEach((def) => {
    const match = findFirstKeyword(lower, def.keywords);
    if (!match) return;
    const quote = snippetForIndex(text, match.idx);
    results.push({
      type: def.type,
      deadline: extractDate(quote) ?? (extractDays(quote) ? `${extractDays(quote)} days` : undefined),
      notes: `Detected "${match.keyword}" language.`,
      source: { quote },
    });
  });
  return results;
};

const buildOther = (text: string) => {
  const lower = text.toLowerCase();
  const definitions = [
    { label: "Closing Date", keywords: ["closing date", "close of escrow"] },
    { label: "Earnest Money Deadline", keywords: ["earnest money", "deposit due"] },
    { label: "Possession Date", keywords: ["possession date", "possession"] },
  ];

  const results: Array<{ label: string; value: string; notes?: string; source: { quote: string } }> = [];
  definitions.forEach((def) => {
    const match = findFirstKeyword(lower, def.keywords);
    if (!match) return;
    const quote = snippetForIndex(text, match.idx);
    const value = extractDate(quote) ?? quote;
    results.push({
      label: def.label,
      value,
      notes: `Detected "${match.keyword}" language.`,
      source: { quote },
    });
  });
  return results;
};

export function isProvisionsEnabled() {
  const value = process.env.PROVISIONS_ENABLED ?? "";
  return /^(1|true|yes)$/i.test(value);
}

export async function extractProvisionsFromPdf(buffer: Buffer): Promise<ExtractedProvisions | null> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    const text = normalizeText(result.text || "");
    if (!text || text.length < 50) return null;
    const promissoryNote = buildPromissoryNote(text);
    const feasibility = buildFeasibility(text);
    const financing = buildFinancing(text);
    const contingencies = buildContingencies(text);
    const other = buildOther(text);

    return {
      promissoryNote,
      feasibility,
      financing,
      contingencies,
      other,
    };
  } catch (err) {
    console.warn("[provisions] extraction failed", err);
    return null;
  }
}
