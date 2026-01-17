import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDbReady } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureDbReady();

  const versions = await db.emailTemplateVersion.findMany({
    where: { templateId: params.id },
    orderBy: { version: "desc" },
  });
  return NextResponse.json(versions);
}

