import { PrismaClient } from "@prisma/client";

// IMPORTANT:
// Vercel serverless has an ephemeral filesystem. SQLite files in /tmp WILL NOT persist reliably.
// To persist contacts/projects/tasks, configure a persistent DB (e.g. Postgres) and set DATABASE_URL.
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required. Configure a persistent Postgres database (Neon/Vercel Postgres/etc) " +
      "and set DATABASE_URL in your environment variables."
  );
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export default db;

// Backwards-compatible no-op for old call sites that used to initialize ephemeral SQLite on Vercel.
export async function ensureDbReady(): Promise<void> {
  return;
}
