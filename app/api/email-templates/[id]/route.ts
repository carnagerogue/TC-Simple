import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDbReady } from "@/lib/db";
import { validatePlaceholders, parseTags, tagsToString } from "@/lib/emailTemplates";
import { TemplateCategory } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureDbReady();

  const body = await req.json().catch(() => null);
  const { name, category, description, subject, body: tmplBody, tags, favorite } = body || {};

  const existing = await db.emailTemplate.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cat = category ? (category as string).toUpperCase() : existing.category;
  if (category && !(cat in TemplateCategory)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  if (subject || tmplBody) {
    const validation = validatePlaceholders(`${subject ?? existing.subject}\n${tmplBody ?? existing.body}`);
    if (validation.unknown.length) {
      return NextResponse.json({ error: "Unknown placeholders", unknown: validation.unknown }, { status: 400 });
    }
  }

  const updated = await db.emailTemplate.update({
    where: { id: params.id },
    data: {
      name: name ?? existing.name,
      category: cat as TemplateCategory,
      description: description ?? existing.description,
      subject: subject ?? existing.subject,
      body: tmplBody ?? existing.body,
      favorite: typeof favorite === "boolean" ? favorite : existing.favorite,
      tags: tags !== undefined ? tagsToString(parseTags(tags)) : existing.tags,
      version: existing.version + 1,
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

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureDbReady();

  await db.emailTemplate.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

