export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDbReady } from "@/lib/db";

type SessionUser = { id?: string; email?: string | null };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeDate(value: unknown): Date | null {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || value instanceof Date) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function safeFloat(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[^0-9.]/g, ""));
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function getString(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

export async function POST(request: NextRequest) {
  const requireParse =
    request.nextUrl.searchParams.get("requireParse") === "1" ||
    request.nextUrl.searchParams.get("requireParse") === "true";

  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  const userId = user?.id || user?.email || null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure tables exist for the ephemeral /tmp SQLite DB on Vercel.
  try {
    await ensureDbReady();
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unable to initialize database";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF uploads are currently supported." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const document = await db.document.create({
      data: {
        userId,
        filename: file.name,
        mimeType: file.type || "application/pdf",
        size: file.size,
        data: buffer,
      },
    });

    let transactionId: string | null = null;
    let parsedData: Record<string, unknown> | null = null;

    // Call Intake Service (best-effort)
    try {
      const intakeUrl =
        process.env.PARSER_URL ||
        process.env.INTAKE_SERVICE_URL ||
        (!process.env.VERCEL ? "http://localhost:8000/intake" : null);
      if (!intakeUrl) {
        if (requireParse) {
          return NextResponse.json(
            {
              error:
                "Parser is not configured. Set PARSER_URL (or INTAKE_SERVICE_URL) to the public URL of your intake-service, ending with /intake.",
              documentId: document.id,
            },
            { status: 503 }
          );
        }
        // Not configured; skip parsing (upload still works)
        parsedData = null;
      } else {
        const intakeFormData = new FormData();
        intakeFormData.append("file", new Blob([buffer], { type: file.type }), file.name);

        const intakeRes = await fetch(intakeUrl, {
          method: "POST",
          body: intakeFormData,
        });

        if (intakeRes.ok) {
          const json = (await intakeRes.json().catch(() => null)) as unknown;
          parsedData = isRecord(json) ? json : null;
          if (requireParse && !parsedData) {
            return NextResponse.json(
              { error: "Parser returned invalid JSON.", documentId: document.id },
              { status: 502 }
            );
          }
          if (requireParse && parsedData && typeof parsedData.error === "string") {
            return NextResponse.json(
              { error: parsedData.error, documentId: document.id, details: parsedData },
              { status: 502 }
            );
          }
        } else {
          const text = await intakeRes.text().catch(() => "");
          console.warn("Intake service failed:", text);
          if (requireParse) {
            return NextResponse.json(
              { error: `Intake service failed (${intakeRes.status}) ${text}`, documentId: document.id },
              { status: 502 }
            );
          }
        }
      }
    } catch (e: unknown) {
      console.warn("Failed to connect to intake service:", e);
      if (requireParse) {
        return NextResponse.json(
          {
            error:
              "Failed to connect to intake-service. Ensure PARSER_URL (or INTAKE_SERVICE_URL) is publicly reachable and includes /intake.",
            documentId: document.id,
          },
          { status: 502 }
        );
      }
    }

    // Create Transaction in DB (best-effort)
    try {
      const p = parsedData ?? {};

      const transaction = await db.transaction.create({
        data: {
          address: getString(p, "property_address") ?? file.name.replace(/\\.pdf$/i, ""),
          city: getString(p, "property_city"),
          county: getString(p, "property_county"),
          state: getString(p, "property_state"),
          zip: getString(p, "property_zip"),

          buyerName: getString(p, "buyer_name"),
          sellerName: getString(p, "seller_name"),

          contractDate: safeDate(p["contract_date"]),
          effectiveDate: safeDate(p["effective_date"]),
          closingDate: safeDate(p["closing_date"]),
          possessionDate: safeDate(p["possession_date"]),
          earnestMoneyDueDate: safeDate(p["earnest_money_delivery_date"]),

          purchasePrice: safeFloat(p["purchase_price"]),
          earnestMoneyAmount: safeFloat(p["earnest_money_amount"]),

          titleCompany: getString(p, "title_insurance_company"),
          closingCompany: getString(p, "closing_agent_company"),
          closingAgentName: getString(p, "closing_agent_name"),

          includedItems: (() => {
            const v = p["included_items"];
            if (Array.isArray(v)) {
              const parts = v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
              return parts.length ? parts.join(", ") : null;
            }
            return typeof v === "string" && v.trim().length > 0 ? v : null;
          })(),

          stage: "Intake",
          userId,
        },
      });

      transactionId = transaction.id;

      try {
        await db.document.update({
          where: { id: document.id },
          data: { transactionId: transaction.id },
        });
      } catch (linkErr: unknown) {
        console.warn("Failed to link document to transaction:", linkErr);
      }
    } catch (dbError: unknown) {
      console.error("Failed to save transaction to DB:", dbError);
    }

    return NextResponse.json({
      message: "Upload processed successfully.",
      fileName: file.name,
      fileSize: file.size,
      uploadedBy: user?.email ?? null,
      documentId: document.id,
      transactionId,
      parsedData,
    });
  } catch (error: unknown) {
    console.error("Failed to process upload:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Unable to save the file. ${error.message}`
            : "Unable to save the file. Please try again.",
      },
      { status: 500 }
    );
  }
}