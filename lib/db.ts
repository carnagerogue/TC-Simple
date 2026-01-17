import { PrismaClient } from "@prisma/client";

// Prisma reads DATABASE_URL at runtime (because schema.prisma uses env("DATABASE_URL")).
// On Vercel, missing env vars will crash every request that touches the DB.
// Provide a safe default for SQLite so the app can boot for testing.
if (!process.env.DATABASE_URL) {
  // Vercel Functions can write to /tmp (ephemeral). Locally we keep the old dev db path.
  const fallback =
    process.env.VERCEL ? "file:/tmp/tc-simple.db" : "file:./prisma/dev.db";
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