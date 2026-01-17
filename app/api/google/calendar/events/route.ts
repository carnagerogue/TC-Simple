import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleClient } from "@/lib/google";

type CalendarPayload = {
  summary?: string;
  description?: string;
  start?: string;
  end?: string;
  timeZone?: string;
  attendees?: string[];
  location?: string;
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
      { status: 400 }
    );
  }

  const calendar = google.calendar({ version: "v3", auth: googleClient.oauth2Client });

  try {
    const event = await calendar.events.insert({
      calendarId: "primary",
      sendUpdates: "all",
      requestBody: {
        summary: payload.summary,
        description: payload.description,
        location: payload.location,
        start: { dateTime: payload.start, timeZone: payload.timeZone },
        end: { dateTime: payload.end, timeZone: payload.timeZone },
        attendees: payload.attendees?.map((email) => ({ email })),
      },
    });

    return NextResponse.json({
      eventId: event.data.id,
      htmlLink: event.data.htmlLink,
    });
  } catch (error) {
    console.error("Failed to create Google Calendar event:", error);
    return NextResponse.json(
      { error: "Unable to create calendar event. Please try again." },
      { status: 500 }
    );
  }
}
