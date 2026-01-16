import { NextResponse } from "next/server";
import { PrismaClient, TemplateCategory, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
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

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}