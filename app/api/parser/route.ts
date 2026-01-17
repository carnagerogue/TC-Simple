export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

const DEFAULT_PARSER_URL = "http://localhost:8000/intake";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const configured = process.env.PARSER_URL || process.env.INTAKE_SERVICE_URL;
    if (!configured && process.env.VERCEL) {
      return NextResponse.json(
        {
          error:
            "Parser is not configured for production. Set PARSER_URL (or INTAKE_SERVICE_URL) to the public URL of your intake-service, ending with /intake.",
        },
        { status: 503 }
      );
    }

    const parserUrl = configured || DEFAULT_PARSER_URL;
    const outbound = new FormData();
    outbound.append("file", file);

    let res: Response;
    try {
      res = await fetch(parserUrl, {
        method: "POST",
        body: outbound,
      });
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error("Parser request failed to connect:", error.message || err);
      return NextResponse.json(
        {
          error:
            `Parser request failed to connect. ` +
            `Set PARSER_URL (or INTAKE_SERVICE_URL) to a publicly reachable endpoint. ` +
            `Current: ${parserUrl}`,
        },
        { status: 502 }
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Parser response error", res.status, text);
      return NextResponse.json(
        { error: `Parser request failed (${res.status}) ${text}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Parser request failed", error);
    return NextResponse.json({ error: "Parser request failed" }, { status: 500 });
  }
}

