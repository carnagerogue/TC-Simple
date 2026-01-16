"use server";

import { google } from "googleapis";
import { db } from "@/lib/db";
import { ensureGoogleAccessToken } from "@/lib/google/refreshGoogleToken";

type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  scope?: string | null;
  expiresAt?: Date | null;
};

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000/api/auth/callback/google"
);

function isExpired(expiresAt?: Date | null) {
  if (!expiresAt) return true;
  return Date.now() > expiresAt.getTime() - 60_000; // 1 minute skew
}

export async function getStoredTokens(
  userId: string,
  provider = "google"
): Promise<StoredTokens | null> {
  const row = await db.userToken.findFirst({
    where: { userId, provider },
  });
  if (!row) return null;
  return {
    accessToken: row.accessToken,
    refreshToken: row.refreshToken,
    scope: row.scope,
    expiresAt: row.expiresAt,
  };
}

export async function saveTokens(userId: string, provider: string, tokens: StoredTokens) {
  await db.userToken.upsert({
    where: { userId_provider: { userId, provider } },
    create: {
      userId,
      provider,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      scope: tokens.scope ?? undefined,
      expiresAt: tokens.expiresAt ?? null,
      googleAccessToken: tokens.accessToken,
      googleRefreshToken: tokens.refreshToken,
      googleTokenExpiry: tokens.expiresAt ?? null,
    },
    update: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      scope: tokens.scope ?? undefined,
      expiresAt: tokens.expiresAt ?? null,
      googleAccessToken: tokens.accessToken,
      googleRefreshToken: tokens.refreshToken,
      googleTokenExpiry: tokens.expiresAt ?? null,
    },
  });
}

export async function storeGoogleTokens(userId: string, tokens: StoredTokens) {
  return saveTokens(userId, "google", tokens);
}

export async function getValidGoogleAccessToken(userId: string): Promise<string> {
  const refreshed = await ensureGoogleAccessToken(userId);
  return refreshed.accessToken;
}


