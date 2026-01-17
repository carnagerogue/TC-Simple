import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userIds = Array.from(
    new Set([session.user.id, session.user.email].filter((v): v is string => typeof v === "string" && v.length > 0))
  );
  if (userIds.length === 0) redirect("/login");

  const txns = await db.transaction.findMany({
    where: { userId: { in: userIds } },
    orderBy: { createdAt: "desc" },
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

      <div className="mt-6 space-y-3">
        {txns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-sm text-slate-600">
            No transactions yet. Upload a document to create one.
          </div>
        ) : (
          txns.map((t) => (
            <Link
              key={t.id}
              href={`/transactions/${t.id}`}
              className="block rounded-2xl border border-slate-200/70 bg-white px-5 py-4 shadow-sm hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{t.address}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t.stage} · Updated {t.updatedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  View
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

