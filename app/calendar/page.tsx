import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureDbReady } from "@/lib/db";
import { CalendarClient } from "./calendar-client";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  await ensureDbReady();

  return (
    <div className="mx-auto w-full max-w-4xl px-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Calendar</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Google Calendar</h1>
        </div>
        <Link
          href="/dashboard"
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
        >
          Back to dashboard
        </Link>
      </div>
      <CalendarClient />
    </div>
  );
}

