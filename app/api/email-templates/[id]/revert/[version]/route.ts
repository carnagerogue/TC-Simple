import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDbReady } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: { id: string; version: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureDbReady();

  const versionNumber = Number(params.version);
  if (isNaN(versionNumber)) return NextResponse.json({ error: "Invalid version" }, { status: 400 });

  const version = await db.emailTemplateVersion.findUnique({
    where: {
      templateId_version: {
        templateId: params.id,
        version: versionNumber,
      },
    },
  });
  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  const updated = await db.emailTemplate.update({
    where: { id: params.id },
    data: {
      subject: version.subject,
      body: version.body,
      version: version.version + 1,
    },
  });

  await db.emailTemplateVersion.create({
    data: {
      templateId: updated.id,
      version: updated.version,
      subject: updated.subject,
      body: updated.body,
    },
  });

  return NextResponse.json(updated);
}

