import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { TransactionEditor } from "@/components/dashboard/TransactionEditor";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function TransactionDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const transaction = await db.transaction.findUnique({
    where: {
      id: params.id,
      userId: session.user.email!,
    },
  });

  if (!transaction) {
    notFound();
  }

  // Convert Date objects to ISO strings for serialization to Client Component
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

