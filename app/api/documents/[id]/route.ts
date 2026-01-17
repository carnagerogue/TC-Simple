export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDbReady } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userIds = Array.from(
    new Set([session.user.id, session.user.email].filter((v): v is string => typeof v === "string" && v.length > 0))
  );
  if (userIds.length === 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDbReady();

  const doc = await db.document.findFirst({
    where: { id: params.id, userId: { in: userIds } },
    select: { filename: true, mimeType: true, data: true, size: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filename = doc.filename || "document.pdf";
  const mimeType = doc.mimeType || "application/pdf";

  return new NextResponse(doc.data, {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(doc.size ?? doc.data.length),
      "Content-Disposition": `inline; filename=\"${filename.replaceAll("\"", "")}\"`,
      "Cache-Control": "private, no-store",
    },
  });
}

