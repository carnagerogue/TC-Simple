import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

const VALID_CATEGORIES = ["AGENT", "CLIENT", "ESCROW", "VENDOR", "LENDER", "TITLE", "OTHER"] as const;
type Category = (typeof VALID_CATEGORIES)[number];

function buildWhere(userId: string, searchParams: URLSearchParams) {
  const q = searchParams.get("q")?.trim();
  const category = searchParams.get("category")?.toUpperCase();

  const where: Prisma.ContactWhereInput = { userId };

  if (category && VALID_CATEGORIES.includes(category as Category)) {
    where.category = category;
  }

  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { company: { contains: q, mode: "insensitive" } },
      { role: { contains: q, mode: "insensitive" } },
    ];
  }

  return where;
}

function parseSort(sortParam?: string | null) {
  if (sortParam === "name") {
    return [{ firstName: "asc" as const }, { lastName: "asc" as const }];
  }
  return [{ createdAt: "desc" as const }];
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;
  const searchParams = new URL(req.url).searchParams;
  const sort = searchParams.get("sort") || "recent";

  const where = buildWhere(userId, searchParams);
  const orderBy = parseSort(sort);

  const contacts = await db.contact.findMany({
    where,
    orderBy,
  });

  return NextResponse.json({ contacts });
}


