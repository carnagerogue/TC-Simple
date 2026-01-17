import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDbReady } from "@/lib/db";
import { TransactionsListClient } from "@/components/transactions/TransactionsListClient";

type ProjectLite = { id: string; name: string; summary: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userIds = Array.from(
    new Set([session.user.id, session.user.email].filter((v): v is string => typeof v === "string" && v.length > 0))
  );
  if (userIds.length === 0) redirect("/login");

  await ensureDbReady();
  const txns = await db.transaction.findMany({
    where: { userId: { in: userIds } },
    orderBy: { createdAt: "desc" },
  });
  const projects = (await db.project.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, name: true, summary: true },
  })) as ProjectLite[];

  const normalize = (value: string) => value.trim().toLowerCase();
  const projectByTxnId = new Map<string, { id: string; name: string }>();
  const projectByAddress = new Map<string, { id: string; name: string }>();

  projects.forEach((p) => {
    const summary = isRecord(p.summary) ? p.summary : {};
    const txnId = typeof summary.transactionId === "string" ? summary.transactionId : null;
    const address =
      typeof summary.property_address === "string"
        ? summary.property_address
        : typeof summary.address === "string"
        ? summary.address
        : null;
    if (txnId) projectByTxnId.set(txnId, { id: p.id, name: p.name });
    if (address) projectByAddress.set(normalize(address), { id: p.id, name: p.name });
  });

  const rows = txns.map((t) => {
    const byTxn = projectByTxnId.get(t.id) || null;
    const byAddr = t.address ? projectByAddress.get(normalize(t.address)) : null;
    return {
      id: t.id,
      address: t.address,
      stage: t.stage || "Intake",
      updatedAt: t.updatedAt.toISOString(),
      project: byTxn || byAddr || null,
    };
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Transactions</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Your transactions</h1>
        </div>
        <Link
          href="/upload"
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
        >
          New transaction
        </Link>
      </div>

      <div className="mt-6">
        <TransactionsListClient transactions={rows} />
      </div>
    </div>
  );
}

