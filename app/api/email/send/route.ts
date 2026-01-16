import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleClient } from "@/lib/google";

type EmailPayload = {
  to?: string[];
  subject?: string;
  body?: string;
  cc?: string[];
  bcc?: string[];
};

const encodeMessage = (payload: EmailPayload) => {
  if (!payload.to?.length) {
    throw new Error("At least one recipient is required.");
  }

  const headers = [
    `To: ${payload.to.join(", ")}`,
    payload.cc?.length ? `Cc: ${payload.cc.join(", ")}` : null,
    payload.bcc?.length ? `Bcc: ${payload.bcc.join(", ")}` : null,
    `Subject: ${payload.subject ?? "TC Simple Update"}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    payload.body ?? "",
  ]
    .filter(Boolean)
    .join("\r\n");

  return Buffer.from(headers).toString("base64url");
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

  const payload: EmailPayload = await request.json();

  try {
    const gmail = google.gmail({ version: "v1", auth: googleClient.oauth2Client });

    const raw = encodeMessage(payload);

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw,
      },
    });

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("Failed to send email via Gmail:", error);
    return NextResponse.json({ error: "Unable to send email." }, { status: 500 });
  }
}

