import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Basic validation/cleanup of dates
  const safeDate = (d: string | null) => (d ? new Date(d) : null);

  try {
    const transaction = await db.transaction.update({
      where: {
        id: params.id,
        // Ensure user owns this transaction (optional, depending on your auth model)
        userId: session.user.email!,
      },
      data: {
        ...body,
        contractDate: body.contractDate ? safeDate(body.contractDate) : undefined,
        effectiveDate: body.effectiveDate ? safeDate(body.effectiveDate) : undefined,
        closingDate: body.closingDate ? safeDate(body.closingDate) : undefined,
        possessionDate: body.possessionDate ? safeDate(body.possessionDate) : undefined,
        earnestMoneyDueDate: body.earnestMoneyDueDate ? safeDate(body.earnestMoneyDueDate) : undefined,
      },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Failed to update transaction:", error);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await db.transaction.delete({
            where: {
                id: params.id,
                userId: session.user.email!,
            }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}

