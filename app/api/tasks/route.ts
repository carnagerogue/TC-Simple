import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { transactionId, title, dueDate, status } = body ?? {};

  if (!transactionId || !title) {
    return NextResponse.json({ error: "transactionId and title are required" }, { status: 400 });
  }

  // Ensure the transaction belongs to this user
  const txn = await db.transaction.findFirst({
    where: {
      id: transactionId,
      userId: session.user.id || session.user.email!,
    },
    select: { id: true },
  });

  if (!txn) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const task = await db.task.create({
    data: {
      transactionId,
      title,
      status: status || "upcoming",
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });

  return NextResponse.json(task);
}

