import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const VALID_CATEGORIES = ["AGENT", "CLIENT", "ESCROW", "VENDOR", "LENDER", "TITLE", "OTHER"] as const;
type Category = (typeof VALID_CATEGORIES)[number];

type ContactPayload = {
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  category?: Category;
  company?: string | null;
  role?: string | null;
  notes?: string | null;
  source?: string | null;
  avatarUrl?: string | null;
  lastInteraction?: string | null;
};

type SessionUser = {
  id?: string;
  email?: string | null;
};

function parseSort(sortParam?: string | null) {
  if (sortParam === "name") {
    return [{ firstName: "asc" as const }, { lastName: "asc" as const }];
  }
  // default: recently added
  return [{ createdAt: "desc" as const }];
}

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

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  const userId = user?.id || user?.email || null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  const userId = user?.id || user?.email || null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as ContactPayload;
  const {
    firstName,
    lastName,
    email,
    phone,
    category = "OTHER",
    company,
    role,
    notes,
    source = "internal",
    avatarUrl,
    lastInteraction,
  } = body;

  if (!firstName) {
    return NextResponse.json({ error: "firstName is required" }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  try {
    const contact = await db.contact.create({
      data: {
        userId,
        firstName,
        lastName: lastName || null,
        email: email || null,
        phone: phone || null,
        category,
        company: company || null,
        role: role || null,
        notes: notes || null,
        source: source || "internal",
        avatarUrl: avatarUrl || null,
        lastInteraction: lastInteraction ? new Date(lastInteraction) : null,
      },
    });

    return NextResponse.json({ contact });
  } catch (e: unknown) {
    console.error("Create contact error", e);
    const error = e as { message?: string };
    return NextResponse.json({ error: error.message ?? "Failed to create contact" }, { status: 500 });
  }
}
