export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDbReady } from "@/lib/db";
import { parseContractFromPdf } from "@/lib/parser/contractParser";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type Params = { params: { id: string } };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || session?.user?.email || null;
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDbReady();

  const document = await db.document.findFirst({
    where: { id: params.id, userId },
    select: { id: true, data: true, mimeType: true, filename: true },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const buffer = Buffer.from(document.data);
  let parsedData: Record<string, unknown> | null = null;
  let parseFailure: string | null = null;

  const intakeUrl = process.env.PARSER_URL || process.env.INTAKE_SERVICE_URL || null;
  if (intakeUrl) {
    try {
      const intakeFormData = new FormData();
      intakeFormData.append(
        "file",
        new Blob([buffer], { type: document.mimeType || "application/pdf" }),
        document.filename
      );
      const intakeRes = await fetch(intakeUrl, {
        method: "POST",
        body: intakeFormData,
      });
      if (intakeRes.ok) {
        const json = (await intakeRes.json().catch(() => null)) as unknown;
        parsedData = isRecord(json) ? json : null;
        if (!parsedData) {
          parseFailure = "Parser returned invalid JSON.";
        } else if (typeof parsedData.error === "string") {
          parseFailure = parsedData.error;
          parsedData = null;
        }
      } else {
        const text = await intakeRes.text().catch(() => "");
        parseFailure = `Intake service failed (${intakeRes.status}) ${text}`.trim();
      }
    } catch (e: unknown) {
      parseFailure =
        e instanceof Error ? `Failed to connect to intake-service. ${e.message}` : "Failed to connect to intake-service.";
    }
  }

  if (!parsedData) {
    try {
      parsedData = await parseContractFromPdf(buffer);
    } catch (e: unknown) {
      parseFailure = e instanceof Error ? e.message : "Parser failed.";
    }
  }

  if (!parsedData) {
    const message = parseFailure ?? "Unable to parse document.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ parsedData });
}
