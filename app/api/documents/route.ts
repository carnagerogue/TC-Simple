import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userIds = Array.from(
    new Set(
      [
        (session.user as any).id || null,
        (session.user as any).email || null,
        session.user.email || null,
      ].filter(Boolean) as string[]
    )
  );

  const [docs, txns, projects] = await Promise.all([
    db.document.findMany({
      where: { userId: { in: userIds } },
      orderBy: { createdAt: "desc" },
    }),
    db.transaction.findMany({
      where: { userId: { in: userIds } },
      select: { id: true, address: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    db.project.findMany({
      where: { userId: { in: userIds } },
      select: { id: true, name: true, summary: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const normalize = (v: string) => v.trim().toLowerCase();
  const stripPdf = (name: string) => name.replace(/\.pdf$/i, "");

  const txnById = new Map(txns.map((t) => [t.id, t]));
  const txnByAddress = new Map<string, typeof txns[number]>();
  txns.forEach((t) => {
    if (t.address) txnByAddress.set(normalize(t.address), t);
  });

  const projectByDocId = new Map<string, { id: string; name: string }>();
  const projectByTxnId = new Map<string, { id: string; name: string }>();
  const projectByAddress = new Map<string, { id: string; name: string }>();

  projects.forEach((p) => {
    const summary = (p.summary as any) || {};
    const docId = typeof summary.documentId === "string" ? summary.documentId : null;
    const txnId = typeof summary.transactionId === "string" ? summary.transactionId : null;
    const address =
      typeof summary.property_address === "string"
        ? summary.property_address
        : typeof summary.address === "string"
        ? summary.address
        : null;

    if (docId) projectByDocId.set(docId, { id: p.id, name: p.name });
    if (txnId) projectByTxnId.set(txnId, { id: p.id, name: p.name });
    if (address) projectByAddress.set(normalize(address), { id: p.id, name: p.name });
  });

  return NextResponse.json(
    docs.map((d) => ({
      id: d.id,
      filename: d.filename,
      mimeType: d.mimeType,
      size: d.size,
      createdAt: d.createdAt.toISOString(),
      documentUrl: `/api/documents/${d.id}`,
      transaction: (() => {
        if (d.transactionId && txnById.has(d.transactionId)) {
          const t = txnById.get(d.transactionId)!;
          return { id: t.id, address: t.address };
        }
        const guess = txnByAddress.get(normalize(stripPdf(d.filename)));
        return guess ? { id: guess.id, address: guess.address } : null;
      })(),
      project: (() => {
        const direct = projectByDocId.get(d.id);
        if (direct) return direct;
        const txn =
          (d.transactionId && txnById.get(d.transactionId)) ||
          txnByAddress.get(normalize(stripPdf(d.filename))) ||
          null;
        if (txn) {
          const byTxn = projectByTxnId.get(txn.id);
          if (byTxn) return byTxn;
          const byAddr = projectByAddress.get(normalize(txn.address));
          if (byAddr) return byAddr;
        }
        return null;
      })(),
    }))
  );
}

