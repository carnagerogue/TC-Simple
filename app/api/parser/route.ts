export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { parseContractFromPdf } from "@/lib/parser/contractParser";

const DEFAULT_PARSER_URL = "http://localhost:8000/intake";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const configured = process.env.PARSER_URL || process.env.INTAKE_SERVICE_URL;
    const parserUrl = configured || (!process.env.VERCEL ? DEFAULT_PARSER_URL : null);

    if (parserUrl) {
      const outbound = new FormData();
      outbound.append("file", file);

      let res: Response | null = null;
      try {
        res = await fetch(parserUrl, {
          method: "POST",
          body: outbound,
        });
      } catch (err: unknown) {
        const error = err as { message?: string };
        console.error("Parser request failed to connect:", error.message || err);
      }

      if (res?.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }

      if (res && !res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Parser response error", res.status, text);
      }
    }

    // Fallback: parse directly via OpenAI (no external intake-service needed)
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      const data = await parseContractFromPdf(buffer);
      return NextResponse.json(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Parser request failed";
      const status = message.toLowerCase().includes("openai is not configured") ? 503 : 500;
      return NextResponse.json({ error: message }, { status });
    }
  } catch (error) {
    console.error("Parser request failed", error);
    return NextResponse.json({ error: "Parser request failed" }, { status: 500 });
  }
}

