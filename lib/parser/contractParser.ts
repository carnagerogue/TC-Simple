import { buildTasksFromItems } from "@/lib/projectTaskTemplates";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_TEXT_CHARS = 20000;

const FIELDS = [
  "buyer_name",
  "seller_name",
  "property_address",
  "property_city",
  "property_county",
  "property_state",
  "property_zip",
  "purchase_price",
  "earnest_money_amount",
  "earnest_money_delivery_date",
  "contract_date",
  "effective_date",
  "closing_date",
  "possession_date",
  "title_insurance_company",
  "closing_agent_company",
  "closing_agent_name",
  "information_verification_period",
  "included_items",
  "buyer_signed_date",
  "seller_signed_date",
] as const;

type ParsedOutput = Record<string, unknown> & { tasks?: unknown };

function extractJson(content: string): ParsedOutput {
  const cleaned = content.trim().replace(/^```json/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned) as ParsedOutput;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("OpenAI returned non-JSON output.");
    }
    return JSON.parse(match[0]) as ParsedOutput;
  }
}

function normalizeTasks(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((t) => {
        if (typeof t === "string") return t.trim();
        if (t && typeof t === "object" && "title" in t) {
          const title = (t as { title?: unknown }).title;
          return typeof title === "string" ? title.trim() : "";
        }
        return "";
      })
      .filter((t) => t.length > 0);
  }
  if (typeof raw === "string") {
    return raw
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }
  return [];
}

function normalizeIncludedItems(raw: unknown): string[] | null {
  if (Array.isArray(raw)) {
    const items = raw
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter((v) => v.length > 0);
    return items.length ? items : null;
  }
  if (typeof raw === "string") {
    const items = raw
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    return items.length ? items : null;
  }
  return null;
}

function buildPrompt(rawText: string): string {
  return [
    "You are a real estate transaction coordinator AI.",
    "Extract the fields listed below from the contract text.",
    "Return ONLY valid JSON. No commentary, no markdown, no code fences.",
    "Use null when a field is not present.",
    "Dates should be ISO strings (YYYY-MM-DD) when possible.",
    "purchase_price and earnest_money_amount should be numeric (no $).",
    "included_items must be an array of strings (only items explicitly included).",
    "Generate a tasks array with 8-14 concise, actionable task strings based on deadlines and milestones.",
    "",
    "Fields:",
    "- buyer_name",
    "- seller_name",
    "- property_address",
    "- property_city",
    "- property_county",
    "- property_state",
    "- property_zip",
    "- purchase_price",
    "- earnest_money_amount",
    "- earnest_money_delivery_date",
    "- contract_date",
    "- effective_date",
    "- closing_date",
    "- possession_date",
    "- title_insurance_company",
    "- closing_agent_company",
    "- closing_agent_name",
    "- information_verification_period",
    "- included_items",
    "- buyer_signed_date",
    "- seller_signed_date",
    "",
    "Contract text:",
    rawText,
  ].join("\n");
}

function normalizeOutput(data: ParsedOutput): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const field of FIELDS) {
    if (field === "included_items") {
      output[field] = normalizeIncludedItems(data[field]);
    } else {
      output[field] = data[field] === undefined ? null : data[field];
    }
  }

  const tasks = normalizeTasks(data.tasks);
  if (tasks.length > 0) {
    output.tasks = tasks;
  } else {
    const items = FIELDS.filter((f) => f !== "included_items")
      .map((f) => ({ field: f, value: output[f] }))
      .filter((item) => item.value != null && item.value !== "");
    const fallback = buildTasksFromItems(
      items.map((i) => ({
        field: i.field,
        value: typeof i.value === "string" || Array.isArray(i.value) ? i.value : String(i.value ?? ""),
      }))
    ).map((t) => t.title);
    output.tasks = fallback;
  }

  return output;
}

export async function parseContractFromPdf(buffer: Buffer): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OpenAI is not configured. Set OPENAI_API_KEY (or configure PARSER_URL to an intake-service)."
    );
  }

  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(buffer);
  const text = (result.text || "").trim();
  if (text.length < 200) {
    throw new Error(
      "Unable to extract readable text from the PDF. If this is a scanned document, configure the OCR intake-service or upload a text-based PDF."
    );
  }

  const clipped = text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text;
  const prompt = buildPrompt(clipped);
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Return only valid JSON that matches the requested schema." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`OpenAI request failed (${response.status}). ${text}`.trim());
  }

  const payload = (await response.json().catch(() => null)) as
    | { choices?: Array<{ message?: { content?: string } }> }
    | null;
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  const raw = extractJson(content);
  return normalizeOutput(raw);
}
