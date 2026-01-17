export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

function envPresent(key: string): boolean {
  const v = process.env[key];
  return typeof v === "string" && v.length > 0;
}

export async function GET() {
  const env = {
    DATABASE_URL: envPresent("DATABASE_URL"),
    NEXTAUTH_SECRET: envPresent("NEXTAUTH_SECRET"),
    NEXTAUTH_URL: envPresent("NEXTAUTH_URL"),
    GOOGLE_CLIENT_ID: envPresent("GOOGLE_CLIENT_ID"),
    GOOGLE_CLIENT_SECRET: envPresent("GOOGLE_CLIENT_SECRET"),
  };

  let prismaOk = false;
  let prismaError: string | null = null;
  try {
    await db.$queryRaw(Prisma.sql`SELECT 1`);
    prismaOk = true;
  } catch (e: unknown) {
    prismaError = e instanceof Error ? e.message : "Unknown Prisma error";
  }

  // Basic “do tables exist?” checks. These will fail if migrations/schema weren’t applied.
  const tables: Record<string, { ok: boolean; error?: string }> = {};
  for (const name of ["transaction", "project", "projectTask", "emailTemplate"] as const) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any)[name].count();
      tables[name] = { ok: true };
    } catch (e: unknown) {
      tables[name] = { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  return NextResponse.json({
    ok: prismaOk,
    env,
    prisma: { ok: prismaOk, error: prismaError },
    tables,
  });
}

