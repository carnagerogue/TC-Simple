import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SiteHeaderClient } from "@/components/site-header-client";

export async function SiteHeader() {
  const session = await getServerSession(authOptions);

  return <SiteHeaderClient isAuthenticated={Boolean(session)} />;
}

