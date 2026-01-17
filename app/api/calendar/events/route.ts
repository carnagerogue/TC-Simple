import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleClient } from "@/lib/google";
import { db } from "@/lib/db";

type CalendarPayload = {
  summary?: string;
  description?: string;
  start?: string;
  end?: string;
  attendees?: string[];
  location?: string;
  kind?: "project" | "transaction";
  taskId?: string;
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const googleClient = await getGoogleClient(request);

  if ("error" in googleClient) {
    return NextResponse.json({ error: googleClient.error }, { status: 401 });
  }

  const payload: CalendarPayload = await request.json();

  if (!payload.summary || !payload.start || !payload.end) {
    return NextResponse.json(
      { error: "Summary, start, and end date-times are required." },
      { status: 400 },
    );
  }

  const calendar = google.calendar({ version: "v3", auth: googleClient.oauth2Client });

  try {
    const userId = session.user.id || session.user.email || null;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Optional de-dupe: if this task was already synced, return the existing link.
    if (payload.kind && payload.taskId) {
      const existing = await db.calendarSync.findFirst({
        where: { userId, provider: "google", kind: payload.kind, taskId: payload.taskId },
      });
      if (existing?.htmlLink) {
        return NextResponse.json({ eventId: existing.eventId, htmlLink: existing.htmlLink, reused: true });
      }
    }

    const event = await calendar.events.insert({
      calendarId: "primary",
      sendUpdates: "all",
      requestBody: {
        summary: payload.summary,
        description: payload.description,
        location: payload.location,
        start: { dateTime: payload.start },
        end: { dateTime: payload.end },
        attendees: payload.attendees?.map((email) => ({ email })),
      },
    });

    if (payload.kind && payload.taskId && event.data.id) {
      try {
        await db.calendarSync.upsert({
          where: {
            userId_provider_kind_taskId: {
              userId,
              provider: "google",
              kind: payload.kind,
              taskId: payload.taskId,
            },
          },
          create: {
            userId,
            provider: "google",
            kind: payload.kind,
            taskId: payload.taskId,
            calendarId: "primary",
            eventId: event.data.id,
            htmlLink: event.data.htmlLink ?? null,
          },
          update: {
            calendarId: "primary",
            eventId: event.data.id,
            htmlLink: event.data.htmlLink ?? null,
          },
        });
      } catch (e) {
        // don't block creation if sync bookkeeping fails
        console.warn("[calendar/events] Failed to persist CalendarSync", e);
      }
    }

    return NextResponse.json({
      eventId: event.data.id,
      htmlLink: event.data.htmlLink,
    });
  } catch (error) {
    console.error("Failed to create Google Calendar event:", error);
    return NextResponse.json(
      { error: "Unable to create calendar event. Please try again." },
      { status: 500 },
    );
  }
}

