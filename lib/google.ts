import { google } from "googleapis";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function getGoogleClient(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.access_token) {
    return { error: "No Google access token found." } as const;
  }

  if (token.error) {
    return { error: token.error } as const;
  }

  // Provide clientId/secret so OAuth2Client can refresh access tokens using refresh_token at runtime.
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    access_token: token.access_token as string,
    refresh_token: token.refresh_token as string | undefined,
  });

  return { oauth2Client, token } as const;
}

