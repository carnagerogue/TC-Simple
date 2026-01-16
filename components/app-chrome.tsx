"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/dashboard/Sidebar";

type Props = {
  children: ReactNode;
};

export function AppChrome({ children }: Props) {
  const pathname = usePathname();
  const { status } = useSession();

  // Keep marketing/login screens clean.
  const hideSidebar = pathname === "/" || pathname.startsWith("/login");
  const showSidebar = status === "authenticated" && !hideSidebar;

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 text-slate-900">
      <Sidebar />
      <div className="w-full overflow-x-hidden">{children}</div>
    </div>
  );
}


