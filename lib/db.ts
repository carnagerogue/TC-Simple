import { PrismaClient } from "@prisma/client";

function isPostgresUrl(url: string | undefined | null): url is string {
  return typeof url === "string" && /^(postgresql|postgres):\/\//.test(url);
}

function pickDatabaseUrl(): string | null {
  const candidates = [
    process.env.PRISMA_DATABASE_URL,
    process.env.PRISMA_DATABASE_URL_NON_POOLING,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL,
  ];
  return candidates.find(isPostgresUrl) ?? null;
}

// Ensure Prisma always receives a valid Postgres DATABASE_URL at runtime.
// If nothing is configured (common during local builds), fall back to a harmless local default
// so `next build` can compile. Runtime requests will still fail loudly if the DB isn't reachable.
const pickedUrl = pickDatabaseUrl();
const dbUrl = pickedUrl ?? "postgresql://postgres:postgres@localhost:5432/tc_simple?schema=public";
if (!pickedUrl) {
  console.warn(
    "[db] No Postgres DATABASE_URL/POSTGRES_URL/PRISMA_DATABASE_URL found; using local fallback for build/dev. " +
      "On Vercel you MUST configure a real Postgres URL."
  );
}
process.env.DATABASE_URL = dbUrl;

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export default db;

// Backwards-compatible no-op for old call sites.
export async function ensureDbReady(): Promise<void> {
  return;
}
