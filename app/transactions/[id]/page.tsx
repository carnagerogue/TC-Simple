import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDbReady } from "@/lib/db";
import { TransactionEditor } from "@/components/dashboard/TransactionEditor";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export default async function TransactionDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userIds = Array.from(
    new Set([session.user.id, session.user.email].filter((v): v is string => typeof v === "string" && v.length > 0))
  );
  if (userIds.length === 0) redirect("/login");

  await ensureDbReady();
  const transaction = await db.transaction.findFirst({
    where: { id: params.id, userId: { in: userIds } },
  });

  if (!transaction) notFound();

  const serializedTransaction = {
    ...transaction,
    contractDate: transaction.contractDate?.toISOString() ?? null,
    effectiveDate: transaction.effectiveDate?.toISOString() ?? null,
    closingDate: transaction.closingDate?.toISOString() ?? null,
    possessionDate: transaction.possessionDate?.toISOString() ?? null,
    earnestMoneyDueDate: transaction.earnestMoneyDueDate?.toISOString() ?? null,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };

  return <TransactionEditor transaction={serializedTransaction} />;
}

