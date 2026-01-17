export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleClient } from "@/lib/google";

function safeString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const googleClient = await getGoogleClient(request);
  if ("error" in googleClient) {
    return NextResponse.json({ error: googleClient.error }, { status: 401 });
  }

  const calendar = google.calendar({ version: "v3", auth: googleClient.oauth2Client });

  const now = new Date();
  const days = Math.min(Math.max(Number(request.nextUrl.searchParams.get("days") ?? "30"), 1), 365);
  const timeMax = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  try {
    const res = await calendar.events.list({
      calendarId: "primary",
      singleEvents: true,
      orderBy: "startTime",
      timeMin: now.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 250,
    });

    const items = (res.data.items ?? []).map((e) => ({
      id: safeString(e.id),
      summary: safeString(e.summary) ?? "(No title)",
      htmlLink: safeString(e.htmlLink),
      location: safeString(e.location),
      start: safeString(e.start?.dateTime ?? e.start?.date) ?? null,
      end: safeString(e.end?.dateTime ?? e.end?.date) ?? null,
      status: safeString(e.status),
    }));

    return NextResponse.json({ days, events: items });
  } catch (err) {
    console.error("[calendar/upcoming] list failed", err);
    return NextResponse.json({ error: "Unable to load Google Calendar events." }, { status: 500 });
  }
}

