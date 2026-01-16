import { db } from "@/lib/db";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SKEW_MS = 60_000; // refresh one minute early to be safe

export type GoogleTokenRecord = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date | null;
  scope?: string | null;
  tokenType?: string | null;
};

export type RefreshDeps = {
  fetchImpl?: typeof fetch;
  now?: () => number;
  dbClient?: typeof db;
};

export function isAccessTokenExpired(expiresAt?: Date | null, now = Date.now()): boolean {
  if (!expiresAt) return true;
  return now > expiresAt.getTime() - SKEW_MS;
}

async function refreshWithGoogle(refreshToken: string, fetchImpl: typeof fetch) {
  const res = await fetchImpl(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMessage = data.error_description || data.error || res.statusText;
    throw new Error(`Google token refresh failed: ${errorMessage}`);
  }

  const expiresAt = data.expires_in ? new Date(Date.now() + Number(data.expires_in) * 1000) : null;

  return {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token as string) || refreshToken,
    expiresAt,
    scope: data.scope as string | undefined,
    tokenType: data.token_type as string | undefined,
  };
}

/**
 * Ensures we always return a valid Google access token, refreshing and persisting it if needed.
 */
export async function refreshGoogleToken(refreshToken: string, fetchImpl: typeof fetch = fetch) {
  const res = await fetchImpl(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("Failed to refresh Google token", data);
    throw new Error("Google token refresh failed");
  }

  return data;
}

export async function ensureGoogleAccessToken(
  userId: string,
  { fetchImpl = fetch, now = () => Date.now(), dbClient = db }: RefreshDeps = {}
): Promise<GoogleTokenRecord> {
  const tokens = await dbClient.userToken.findFirst({
    where: { userId, provider: "google" },
  });

  if (!tokens) {
    throw new Error("No Google tokens found; please reconnect Google.");
  }

  if (!tokens.refreshToken && !tokens.googleRefreshToken) {
    throw new Error("Missing Google refresh token. User must re-authenticate with Google.");
  }

  const refreshToken = tokens.refreshToken || tokens.googleRefreshToken || "";
  const accessToken = tokens.accessToken || tokens.googleAccessToken || "";
  const expiresAt = tokens.expiresAt || tokens.googleTokenExpiry || null;

  if (accessToken && !isAccessTokenExpired(expiresAt, now())) {
    return { accessToken, refreshToken, expiresAt, scope: tokens.scope };
  }

  const refreshed = await refreshWithGoogle(refreshToken, fetchImpl);

  await dbClient.userToken.upsert({
    where: { userId_provider: { userId, provider: "google" } },
    create: {
      userId,
      provider: "google",
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      scope: refreshed.scope,
      expiresAt: refreshed.expiresAt,
      googleAccessToken: refreshed.accessToken,
      googleRefreshToken: refreshed.refreshToken,
      googleTokenExpiry: refreshed.expiresAt,
    },
    update: {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      scope: refreshed.scope,
      expiresAt: refreshed.expiresAt,
      googleAccessToken: refreshed.accessToken,
      googleRefreshToken: refreshed.refreshToken,
      googleTokenExpiry: refreshed.expiresAt,
    },
  });

  return refreshed;
}

