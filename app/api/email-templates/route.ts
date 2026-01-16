import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { validatePlaceholders, parseTags, tagsToString } from "@/lib/emailTemplates";
import { TemplateCategory } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id || session.user.email!;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const category = searchParams.get("category");
  const favorite = searchParams.get("favorite") === "true";
  const statsOnly = searchParams.get("stats") === "true";

  const where: any = {};
  if (category) where.category = category.toUpperCase();
  if (favorite) where.favorite = true;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { body: { contains: q, mode: "insensitive" } },
    ];
  }

  const templates = await db.emailTemplate.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });

  const total = templates.length;
  const favorites = templates.filter((t) => t.favorite).length;
  const mostUsed = templates[0]
    ? {
        name: templates[0].name,
        count: templates[0].usageCount || 0,
      }
    : null;

  if (statsOnly) {
    const topTemplates = templates.slice(0, 3).map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      snippet: t.body.slice(0, 120),
      updatedAt: t.updatedAt,
      tags: t.tags,
      usageCount: t.usageCount || 0,
    }));
    return NextResponse.json({
      stats: { total, favorites, mostUsed, topTemplates },
    });
  }

  return NextResponse.json({ templates, stats: { total, favorites, mostUsed } });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await req.headers; // keep for future auth usage

  const body = await req.json().catch(() => null);
  const { name, category, description, subject, body: tmplBody, tags, favorite } = body || {};

  if (!name || !category || !subject || !tmplBody) {
    return NextResponse.json({ error: "name, category, subject, body are required" }, { status: 400 });
  }
  const cat = (category as string).toUpperCase();
  if (!(cat in TemplateCategory)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const validation = validatePlaceholders(`${subject}\n${tmplBody}`);
  if (validation.unknown.length) {
    return NextResponse.json(
      { error: "Unknown placeholders", unknown: validation.unknown },
      { status: 400 }
    );
  }

  const created = await db.emailTemplate.create({
    data: {
      name,
      category: cat as TemplateCategory,
      description: description || null,
      subject,
      body: tmplBody,
      favorite: Boolean(favorite),
      tags: tagsToString(parseTags(tags)),
    },
  });

  await db.emailTemplateVersion.create({
    data: {
      templateId: created.id,
      version: created.version,
      subject: created.subject,
      body: created.body,
    },
  });

  return NextResponse.json(created);
}

