import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDbReady } from "@/lib/db";
import { TemplateCategory, Prisma } from "@prisma/client";
import { parseTags, tagsToString, validatePlaceholders } from "@/lib/emailTemplates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureDbReady();

    const { searchParams } = new URL(request.url);
    
    // Extracting your query parameters
    const category = searchParams.get("category");
    const favorite = searchParams.get("favorite");
    const q = searchParams.get("q");

    // 1. Initialize the 'where' object with the correct Prisma Type
    const where: Prisma.EmailTemplateWhereInput = {};

    // 2. Safely handle the Enum type casting for category
    if (category) {
      const upperCategory = category.toUpperCase();
      
      // Check if the string exists in the Prisma Enum before assigning
      if (Object.values(TemplateCategory).includes(upperCategory as TemplateCategory)) {
        where.category = upperCategory as TemplateCategory;
      }
    }

    // 3. Handle favorite filter
    if (favorite === "true") {
      where.favorite = true;
    }

    // 4. Handle search query
    // NOTE: With SQLite Prisma, `mode: "insensitive"` is not supported in typings and will fail `next build`.
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { subject: { contains: q } },
      ];
    }

    const templates = await db.emailTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    const stats = {
      total: templates.length,
      favorites: templates.filter((t) => t.favorite).length,
      mostUsed: null as { name: string; count: number } | null,
    };

    return NextResponse.json({ templates, stats });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDbReady();

  const body = (await request.json().catch(() => null)) as
    | {
        name?: unknown;
        category?: unknown;
        description?: unknown;
        subject?: unknown;
        body?: unknown;
        tags?: unknown;
        favorite?: unknown;
      }
    | null;

  const name = typeof body?.name === "string" ? body?.name.trim() : "";
  const subject = typeof body?.subject === "string" ? body?.subject.trim() : "";
  const tmplBody = typeof body?.body === "string" ? body?.body.trim() : "";
  const description = typeof body?.description === "string" ? body?.description.trim() : null;

  if (!name || !subject || !tmplBody) {
    return NextResponse.json(
      { error: "name, subject, and body are required" },
      { status: 400 }
    );
  }

  const categoryRaw = typeof body?.category === "string" ? body?.category.toUpperCase() : "GENERAL";
  if (!(categoryRaw in TemplateCategory)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const placeholderCheck = validatePlaceholders(`${subject}\n${tmplBody}`);
  if (placeholderCheck.unknown.length) {
    return NextResponse.json(
      { error: "Unknown placeholders", unknown: placeholderCheck.unknown },
      { status: 400 }
    );
  }

  let tags: string | null = null;
  if (typeof body?.tags === "string") {
    tags = tagsToString(parseTags(body.tags));
  } else if (Array.isArray(body?.tags)) {
    const raw = body.tags.filter((t): t is string => typeof t === "string");
    tags = tagsToString(parseTags(raw.join(",")));
  }

  const favorite = typeof body?.favorite === "boolean" ? body.favorite : false;

  const created = await db.emailTemplate.create({
    data: {
      name,
      category: categoryRaw as TemplateCategory,
      description,
      subject,
      body: tmplBody,
      tags,
      favorite,
      version: 1,
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