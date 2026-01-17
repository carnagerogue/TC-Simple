import { Prisma, PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
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

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export default db;

type DbInitGlobal = { prismaDbInitPromise?: Promise<void> };
const globalForInit = global as unknown as DbInitGlobal;

function looksLikeTmpSqlite(url: string | undefined): boolean {
  return !!url && url.startsWith("file:/tmp/");
}

function prismaCliPath(): string {
  // Vercel runtime bundles node_modules; run the Prisma CLI without npx/network.
  return path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
}

function runDbPushSync() {
  const cli = prismaCliPath();
  if (!fs.existsSync(cli)) {
    throw new Error(`Prisma CLI not found at ${cli}`);
  }
  execSync(`${process.execPath} ${cli} db push --skip-generate`, {
    stdio: "inherit",
    env: {
      ...process.env,
      PRISMA_HIDE_UPDATE_MESSAGE: "1",
      PRISMA_TELEMETRY_INFORMATION: "none",
    },
  });
}

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

  if (!globalForInit.prismaDbInitPromise) {
    globalForInit.prismaDbInitPromise = (async () => {
      try {
        const ok = await hasCoreTables();
        if (ok) return;
        console.log("[db] Missing schema in /tmp sqlite DB; running prisma db push...");
        runDbPushSync();
      } catch (e) {
        console.error("[db] ensureDbReady failed", e);
        throw e;
      }
    })();
  }

  await globalForInit.prismaDbInitPromise;
}
