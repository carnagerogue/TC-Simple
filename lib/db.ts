import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Prisma reads DATABASE_URL at runtime (because schema.prisma uses env("DATABASE_URL")).
// On Vercel, missing env vars will crash every request that touches the DB.
// Provide a safe default for SQLite so the app can boot for testing.
if (!process.env.DATABASE_URL) {
  // Vercel Functions can write to /tmp (ephemeral). Locally we keep the old dev db path.
  const isVercel = !!process.env.VERCEL;
  const dbPath = isVercel ? "/tmp/tc-simple.db" : "./prisma/dev.db";
  const fallback = `file:${dbPath}`;
  
  process.env.DATABASE_URL = fallback;
  console.warn(`[db] DATABASE_URL was missing; using fallback (${fallback}).`);

  // Auto-push schema if DB file is missing (crucial for Vercel /tmp)
  if (isVercel && !fs.existsSync(dbPath)) {
    console.log("[db] DB file missing in /tmp, running 'prisma db push'...");
    try {
      // We need to point to the schema. On Vercel, it's usually at the project root or preserved via config.
      // We'll try to run the command.
      execSync("npx prisma db push --skip-generate", { 
        stdio: "inherit",
        env: { ...process.env, DATABASE_URL: fallback }
      });
      console.log("[db] Schema pushed successfully.");
    } catch (e) {
      console.error("[db] Failed to push schema:", e);
    }
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
