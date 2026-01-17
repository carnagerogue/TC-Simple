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

type PageText = { pageNumber: number; text: string };

type PdfTextItem = { str?: string };
type PdfTextContent = { items: PdfTextItem[] };
type PdfPageData = { pageNumber?: number; getTextContent: () => Promise<PdfTextContent> };

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

const extractPageTexts = async (buffer: Buffer): Promise<PageText[]> => {
  const pdfParse = (await import("pdf-parse")).default;
  const pages: PageText[] = [];
  await pdfParse(buffer, {
    pagerender: async (pageData: PdfPageData) => {
      const content = await pageData.getTextContent();
      const strings = content.items.map((item) => (typeof item.str === "string" ? item.str : "")).join(" ");
      const text = normalizeText(strings);
      if (text.length > 0) {
        pages.push({ pageNumber: pageData.pageNumber ?? pages.length + 1, text });
      }
      return text;
    },
  });
  return pages.sort((a, b) => a.pageNumber - b.pageNumber);
};

type MatchInfo = { pageNumber: number; keyword: string; quote: string };

const findMatchInPages = (pages: PageText[], keywords: string[]): MatchInfo | null => {
  for (const page of pages) {
    const lower = page.text.toLowerCase();
    const match = findFirstKeyword(lower, keywords);
    if (!match) continue;
    return {
      pageNumber: page.pageNumber,
      keyword: match.keyword,
      quote: snippetForIndex(page.text, match.idx),
    };
  }
  return null;
};

const buildPromissoryNote = (pages: PageText[]): PromissoryNoteProvision => {
  const match = findMatchInPages(pages, [
    "promissory note",
    "seller financing",
    "promissory",
    "deferred",
    "payable",
  ]);
  if (!match) {
    return { exists: false };
  }
  const quoteLower = match.quote.toLowerCase();
  return {
    exists: true,
    amount: extractAmount(match.quote),
    dueDate: extractDate(match.quote),
    payer: inferParty(quoteLower, "buyer", "Buyer"),
    payee: inferParty(quoteLower, "seller", "Seller"),
    notes: `Detected "${match.keyword}" language.`,
    source: { page: match.pageNumber, quote: match.quote },
  };
};

const buildFeasibility = (pages: PageText[]): FeasibilityProvision => {
  const match = findMatchInPages(pages, [
    "feasibility contingency",
    "feasibility period",
    "feasibility",
    "inspection period",
    "days after mutual acceptance",
  ]);
  if (!match) {
    return { exists: false };
  }
  const quoteLower = match.quote.toLowerCase();
  return {
    exists: true,
    periodDays: extractDays(match.quote),
    expirationDate: extractDate(match.quote),
    requiresNotice: quoteLower.includes("notice"),
    notes: `Detected "${match.keyword}" language.`,
    source: { page: match.pageNumber, quote: match.quote },
  };
};

const buildFinancing = (pages: PageText[]): FinancingProvision | undefined => {
  const match = findMatchInPages(pages, ["financing", "loan approval", "commitment", "mortgage"]);
  if (!match) return undefined;
  const quoteLower = match.quote.toLowerCase();
  const type = quoteLower.includes("commitment")
    ? "Loan commitment"
    : quoteLower.includes("approval")
    ? "Loan approval"
    : quoteLower.includes("mortgage")
    ? "Mortgage financing"
    : "Financing";
  return {
    type,
    deadline: extractDate(match.quote) ?? (extractDays(match.quote) ? `${extractDays(match.quote)} days` : undefined),
    notes: `Detected "${match.keyword}" language.`,
    source: { page: match.pageNumber, quote: match.quote },
  };
};

const buildContingencies = (pages: PageText[]): ContingencyProvision[] => {
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
    const match = findMatchInPages(pages, def.keywords);
    if (!match) return;
    results.push({
      type: def.type,
      deadline:
        extractDate(match.quote) ?? (extractDays(match.quote) ? `${extractDays(match.quote)} days` : undefined),
      notes: `Detected "${match.keyword}" language.`,
      source: { page: match.pageNumber, quote: match.quote },
    });
  });
  return results;
};

const buildOther = (pages: PageText[]) => {
  const definitions = [
    { label: "Closing Date", keywords: ["closing date", "close of escrow"] },
    { label: "Earnest Money Deadline", keywords: ["earnest money", "deposit due"] },
    { label: "Possession Date", keywords: ["possession date", "possession"] },
  ];

  const results: Array<{ label: string; value: string; notes?: string; source: { quote: string; page?: number } }> = [];
  definitions.forEach((def) => {
    const match = findMatchInPages(pages, def.keywords);
    if (!match) return;
    const value = extractDate(match.quote) ?? match.quote;
    results.push({
      label: def.label,
      value,
      notes: `Detected "${match.keyword}" language.`,
      source: { page: match.pageNumber, quote: match.quote },
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
    const pages = await extractPageTexts(buffer);
    if (!pages.length) return null;
    const promissoryNote = buildPromissoryNote(pages);
    const feasibility = buildFeasibility(pages);
    const financing = buildFinancing(pages);
    const contingencies = buildContingencies(pages);
    const other = buildOther(pages);

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
