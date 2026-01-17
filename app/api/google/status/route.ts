import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleClient } from "@/lib/google";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  }
  const googleClient = await getGoogleClient(request);
  if ("error" in googleClient) {
    return NextResponse.json({ status: "missing", error: googleClient.error });
  }

  try {
    // This will refresh via refresh_token if needed (we provided clientId/secret in lib/google.ts).
    const accessToken = await googleClient.oauth2Client.getAccessToken();
    if (!accessToken?.token) {
      return NextResponse.json({ status: "expired", error: "Unable to refresh Google access token." });
    }
    return NextResponse.json({ status: "ok" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ status: "expired", error: message });
  }
}

