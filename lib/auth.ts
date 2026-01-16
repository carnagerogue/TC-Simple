import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";

const requiredEnv = (key: string) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/directory.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

type TokenExtras = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string | null;
  scope?: string | null;
};

type SessionExtras = {
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
  scope?: string | null;
  tokenType?: string | null;
  error?: string;
  google?: { scopes: string[] };
};

const refreshAccessToken = async (token: JWT) => {
  const tokenWithExtras = token as JWT & TokenExtras;
  try {
    const refreshToken = tokenWithExtras.refreshToken || token.refresh_token;
    if (!refreshToken) {
      throw new Error("Missing refresh token");
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: requiredEnv("GOOGLE_CLIENT_ID"),
        client_secret: requiredEnv("GOOGLE_CLIENT_SECRET"),
        grant_type: "refresh_token",
        refresh_token: refreshToken as string,
      }),
    });

    const data = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Failed to refresh Google access token.");
    }

    return {
      ...token,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: Date.now() + Number(data.expires_in) * 1000,
      tokenType: data.token_type ?? tokenWithExtras.tokenType,
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? refreshToken,
      expires_at: Math.floor(Date.now() / 1000 + Number(data.expires_in)),
      scope: data.scope ?? tokenWithExtras.scope,
      error: undefined,
    };
  } catch (error) {
    console.error("Error refreshing Google access token:", error);
    return { ...token, error: "RefreshAccessTokenError" as const };
  }
};

const googleClientId = requiredEnv("GOOGLE_CLIENT_ID");
const googleClientSecret = requiredEnv("GOOGLE_CLIENT_SECRET");

if (process.env.NODE_ENV !== "production") {
  console.log("[auth] Using GOOGLE_CLIENT_ID:", googleClientId);
}

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: {
        params: {
          scope: GOOGLE_SCOPES,
          prompt: "consent",
          access_type: "offline",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      const tokenWithExtras = token as JWT & TokenExtras;
      if (account) {
        // First-time login or re-consent; capture tokens
        const expiresMs =
          (account.expires_at ? account.expires_at * 1000 : undefined) ??
          (account.expires_in ? Date.now() + account.expires_in * 1000 : undefined);

        tokenWithExtras.accessToken = account.access_token;
        tokenWithExtras.refreshToken = account.refresh_token ?? tokenWithExtras.refreshToken;
        tokenWithExtras.expiresAt = expiresMs ?? tokenWithExtras.expiresAt;
        tokenWithExtras.scope = account.scope ?? tokenWithExtras.scope;
        tokenWithExtras.tokenType = account.token_type ?? tokenWithExtras.tokenType;

        token.access_token = account.access_token;
        token.refresh_token = account.refresh_token ?? token.refresh_token;
        token.expires_at = account.expires_at ?? token.expires_at;
        token.scope = account.scope ?? token.scope;

        console.log("GOOGLE OAUTH CALLBACK", {
          userId: token.sub ?? account.providerAccountId,
          provider: account.provider,
          hasAccessToken: !!account.access_token,
          hasRefreshToken: !!account.refresh_token,
          expiresAt: account.expires_at,
        });

        // Persist tokens server-side
        const uid = token.sub ?? account.providerAccountId;
        if (uid) {
          try {
            await db.userToken.upsert({
              where: {
                userId_provider: {
                  userId: uid,
                  provider: "google",
                },
              },
              create: {
                userId: uid,
                provider: "google",
                accessToken: account.access_token ?? "",
                refreshToken: account.refresh_token ?? "",
                scope: account.scope,
                expiresAt: expiresMs ? new Date(expiresMs) : null,
                tokenType: account.token_type ?? null,
                googleAccessToken: account.access_token ?? "",
                googleRefreshToken: account.refresh_token ?? "",
                googleTokenExpiry: expiresMs ? new Date(expiresMs) : null,
              },
              update: {
                accessToken: account.access_token ?? "",
                refreshToken: account.refresh_token ?? "",
                scope: account.scope,
                expiresAt: expiresMs ? new Date(expiresMs) : null,
                tokenType: account.token_type ?? null,
                googleAccessToken: account.access_token ?? "",
                googleRefreshToken: account.refresh_token ?? "",
                googleTokenExpiry: expiresMs ? new Date(expiresMs) : null,
              },
            });
          } catch (err) {
            console.error("[auth] Failed to persist Google tokens", err);
            // do not block login if persistence fails
          }
        }
      }

      // If expired, refresh
      const expiresAtMs = tokenWithExtras.expiresAt || (token.expires_at ? token.expires_at * 1000 : null);
      const isExpired = !expiresAtMs || expiresAtMs < Date.now() - 60_000;
      if (!isExpired) {
        return token;
      }

      // Refresh flow
      const refreshToken = tokenWithExtras.refreshToken || token.refresh_token;
      if (!refreshToken) return token;
      const refreshed = await refreshGoogleToken(refreshToken);
      const newExpires = Date.now() + Number(refreshed.expires_in) * 1000;

      tokenWithExtras.accessToken = refreshed.access_token;
      tokenWithExtras.refreshToken = refreshed.refresh_token ?? refreshToken;
      tokenWithExtras.expiresAt = newExpires;

      token.access_token = refreshed.access_token;
      token.refresh_token = refreshed.refresh_token ?? refreshToken;
      token.expires_at = Math.floor(newExpires / 1000);
      token.scope = refreshed.scope ?? token.scope;
      tokenWithExtras.tokenType = refreshed.token_type ?? tokenWithExtras.tokenType;
      return token;
    },
    async session({ session, token }) {
      const tokenWithExtras = token as JWT & TokenExtras;
      const sessionWithExtras = session as typeof session & SessionExtras;
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      if (token.error) {
        sessionWithExtras.error = token.error;
      }

      sessionWithExtras.google = {
        scopes: typeof token.scope === "string" ? token.scope.split(" ") : [],
      };
      sessionWithExtras.accessToken = tokenWithExtras.accessToken ?? token.access_token ?? null;
      sessionWithExtras.refreshToken = tokenWithExtras.refreshToken ?? token.refresh_token ?? null;
      sessionWithExtras.expiresAt =
        tokenWithExtras.expiresAt ?? (token.expires_at ? token.expires_at * 1000 : null) ?? null;
      sessionWithExtras.scope = tokenWithExtras.scope ?? token.scope ?? null;
      sessionWithExtras.tokenType = tokenWithExtras.tokenType ?? null;

      return session;
    },
  },
  secret: requiredEnv("NEXTAUTH_SECRET"),
};

