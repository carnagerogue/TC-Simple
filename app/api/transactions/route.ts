import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const toNullableString = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const toNullableNumber = (value: unknown) => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[^0-9.]/g, ""));
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const toNullableDate = (value: unknown) => {
  if (typeof value !== "string" || !value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeIncludedItems = (value: unknown) => {
  if (Array.isArray(value)) {
    const list = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
    return list.length ? list.join(", ") : null;
  }
  return toNullableString(value);
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const ownerId = session.user.email ?? session.user.id;

  if (!ownerId) {
    return NextResponse.json({ error: "Missing user identifier" }, { status: 400 });
  }

  try {
    const transaction = await db.transaction.create({
      data: {
        address: toNullableString(body.address) ?? "Untitled transaction",
        city: toNullableString(body.city),
        county: toNullableString(body.county),
        state: toNullableString(body.state),
        zip: toNullableString(body.zip),
        buyerName: toNullableString(body.buyerName),
        sellerName: toNullableString(body.sellerName),
        contractDate: toNullableDate(body.contractDate),
        effectiveDate: toNullableDate(body.effectiveDate),
        closingDate: toNullableDate(body.closingDate),
        possessionDate: toNullableDate(body.possessionDate),
        earnestMoneyDueDate: toNullableDate(body.earnestMoneyDueDate),
        purchasePrice: toNullableNumber(body.purchasePrice),
        earnestMoneyAmount: toNullableNumber(body.earnestMoneyAmount),
        titleCompany: toNullableString(body.titleCompany),
        closingCompany: toNullableString(body.closingCompany),
        closingAgentName: toNullableString(body.closingAgentName),
        includedItems: normalizeIncludedItems(body.includedItems),
        stage: toNullableString(body.stage) ?? "Intake",
        progress:
          typeof body.progress === "number"
            ? Math.min(100, Math.max(0, Math.round(body.progress)))
            : 0,
        userId: ownerId,
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Failed to create transaction:", error);
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}


