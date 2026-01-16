import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getValidGoogleAccessToken } from "@/lib/google/tokenManager";
import db from "@/lib/db";

type NormalizedContact = {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  source: "gmail";
};

function splitName(displayName?: string): { firstName: string; lastName?: string } {
  if (!displayName) return { firstName: "Unknown" };
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts.shift() || "Unknown", lastName: parts.join(" ") || undefined };
}

function normalizePeopleConnections(data: any): NormalizedContact[] {
  const connections = data.connections || [];
  return connections
    .map((person: any) => {
      const names = person.names?.[0];
      const emails = person.emailAddresses?.[0];
      const phones = person.phoneNumbers?.[0];
      const photos = person.photos?.[0];
      const { firstName, lastName } = splitName(names?.displayName);
      return {
        id: person.resourceName || Math.random().toString(),
        firstName,
        lastName,
        email: emails?.value,
        phone: phones?.value,
        photoUrl: photos?.url,
        source: "gmail" as const,
      };
    })
    .filter((c: NormalizedContact) => c.firstName);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;

  try {
    const accessToken = await getValidGoogleAccessToken(userId);
    if (!accessToken) {
      return NextResponse.json(
        { error: "No Google access token. Please reconnect your Google account." },
        { status: 400 }
      );
    }

    const res = await fetch(
      "https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,photos&sortOrder=FIRST_NAME_ASCENDING",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }
    );

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json(
        { error: "Google permissions expired. Please reconnect your Google account." },
        { status: 401 }
      );
    }

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`People API error: ${txt}`);
    }

    const json = await res.json();
    const contacts = normalizePeopleConnections(json);

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

    return NextResponse.json({ synced: contacts.length });
  } catch (e: any) {
    console.error("sync-gmail error", e);
    return NextResponse.json(
      {
        error: "Unable to sync Gmail contacts",
        detail: e?.message ?? "unknown error",
      },
      { status: 500 }
    );
  }
}
