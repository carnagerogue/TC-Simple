import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { ensureDbReady } from "@/lib/db";
import { fetchAllGoogleConnections, normalizePeopleConnections } from "@/lib/google/contacts";
import { getGoogleClient } from "@/lib/google";
import { getValidGoogleAccessToken } from "@/lib/google/tokenManager";

async function getAccessTokenWithFallback(request: NextRequest, userId: string): Promise<string> {
  const googleClient = await getGoogleClient(request);
  if (!("error" in googleClient)) {
    const accessToken = await googleClient.oauth2Client.getAccessToken();
    if (accessToken?.token) return accessToken.token;
  }
  return await getValidGoogleAccessToken(userId);
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || session?.user?.email || null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureDbReady();

  try {
    const accessToken = await getAccessTokenWithFallback(request, userId);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Google connection missing. Please reconnect your Google account." },
        { status: 401 }
      );
    }

    const connections = await fetchAllGoogleConnections(accessToken);
    const contacts = normalizePeopleConnections({ connections });

    // Upsert into local DB; dedupe by userId + email
    for (const c of contacts) {
      if (!c.email) continue;
      await db.contact.upsert({
        where: {
          userId_email: {
            userId,
            email: c.email,
          },
        },
        create: {
          userId,
          firstName: c.firstName,
          lastName: c.lastName ?? null,
          email: c.email,
          phone: c.phone ?? null,
          avatarUrl: c.photoUrl ?? null,
          source: "gmail",
          category: "OTHER",
        },
        update: {
          firstName: c.firstName,
          lastName: c.lastName ?? null,
          phone: c.phone ?? null,
          avatarUrl: c.photoUrl ?? null,
          source: "gmail",
        },
      });
    }

    return NextResponse.json({ fetched: contacts.length, contacts });
  } catch (e: unknown) {
    console.error("gmail contacts error", e);
    const message = e instanceof Error ? e.message : "unknown error";
    const isAuth = /permission|expired|oauth|401|403/i.test(message);
    return NextResponse.json(
      { error: isAuth ? "Google permissions expired. Please reconnect your Google account." : "Unable to load Gmail contacts", detail: message },
      { status: isAuth ? 401 : 500 }
    );
  }
}


