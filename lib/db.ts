import { Prisma, PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// Prisma reads DATABASE_URL at runtime (because schema.prisma uses env("DATABASE_URL")).
// On Vercel, missing/invalid env vars will crash every request that touches the DB.
// Provide a safe default for SQLite so the app can boot for testing.
const isVercel = !!process.env.VERCEL;
if (!process.env.DATABASE_URL) {
  const dbPath = isVercel ? "/tmp/tc-simple.db" : "./prisma/dev.db";
  const fallback = `file:${dbPath}`;
  process.env.DATABASE_URL = fallback;
  console.warn(`[db] DATABASE_URL was missing; using fallback (${fallback}).`);
}

function sqliteFilePathFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  if (!url.startsWith("file:")) return null;
  return url.replace(/^file:/, "");
}

function looksLikeTmpSqlite(url: string | undefined): boolean {
  const p = sqliteFilePathFromUrl(url);
  return typeof p === "string" && p.startsWith("/tmp/");
}

// Vercel runtime uses an ephemeral /tmp filesystem. Ship a small schema-only SQLite template
// (prisma/vercel.db) and copy it into /tmp on cold start so required tables exist.
if (isVercel && looksLikeTmpSqlite(process.env.DATABASE_URL)) {
  const dbPath = sqliteFilePathFromUrl(process.env.DATABASE_URL) || "/tmp/tc-simple.db";
  const templatePath = path.join(process.cwd(), "prisma", "vercel.db");
  try {
    const needsInit =
      !fs.existsSync(dbPath) || (fs.statSync(dbPath).size < 4096); // empty db is ~0–4KB
    if (needsInit) {
      if (!fs.existsSync(templatePath)) {
        throw new Error(`SQLite template DB missing at ${templatePath}`);
      }
      fs.copyFileSync(templatePath, dbPath);
      console.log(`[db] Initialized sqlite DB from template: ${templatePath} -> ${dbPath}`);
    }
  } catch (e) {
    console.error("[db] Failed to initialize sqlite DB from template", e);
  }
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export default db;

async function hasCoreTables(): Promise<boolean> {
  const rows = (await db.$queryRaw(
    Prisma.sql`
      SELECT name
      FROM sqlite_master
      WHERE type='table'
        AND name IN ('Transaction','Contact','Document','Project','ProjectTask')
    `
  )) as Array<{ name?: string }>;
  const found = new Set(rows.map((r) => r.name).filter((n): n is string => typeof n === "string"));
  const required = ["Transaction", "Contact", "Document", "Project", "ProjectTask"] as const;
  return required.every((t) => found.has(t));
}

/**
 * Ensures the SQLite schema exists on Vercel when using an ephemeral /tmp database.
 * This is needed because /tmp is empty on each cold start.
 */
export async function ensureDbReady(): Promise<void> {
  if (!isVercel) return;
  if (!looksLikeTmpSqlite(process.env.DATABASE_URL)) return;
  const ok = await hasCoreTables();
  if (!ok) {
    throw new Error(
      "Database schema is missing in the Vercel /tmp SQLite database. " +
        "Redeploy the latest build (which includes prisma/vercel.db template), or configure a persistent DATABASE_URL."
    );
  }
}
