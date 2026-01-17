import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getValidGoogleAccessToken } from "@/lib/google/tokenManager";
import db from "@/lib/db";
import { ensureDbReady } from "@/lib/db";
import { fetchAllGoogleConnections, normalizePeopleConnections } from "@/lib/google/contacts";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || session?.user?.email || null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureDbReady();

  try {
    const accessToken = await getValidGoogleAccessToken(userId);
    if (!accessToken) {
      return NextResponse.json(
        { error: "No Google access token. Please reconnect your Google account." },
        { status: 400 }
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
    const error = e as { message?: string };
    return NextResponse.json(
      { error: "Unable to load Gmail contacts", detail: error.message ?? "unknown error" },
      { status: 500 }
    );
  }
}


