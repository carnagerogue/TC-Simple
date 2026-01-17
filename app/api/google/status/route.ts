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
    const scopeString = typeof googleClient.token?.scope === "string" ? googleClient.token.scope : "";
    const scopes = scopeString.split(" ").filter(Boolean);
    const requiredScope = "https://www.googleapis.com/auth/gmail.send";
    if (scopes.length && !scopes.includes(requiredScope)) {
      return NextResponse.json({
        status: "missing_scope",
        error: "Gmail send permission is missing. Reconnect Google to enable sending.",
      });
    }

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

