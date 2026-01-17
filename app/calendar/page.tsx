import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDbReady } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  await ensureDbReady();

  const userId = session.user.id || null;
  const token =
    userId
      ? await db.userToken.findFirst({ where: { userId, provider: "google" } })
      : null;

  const status = !userId ? "missing-userid" : !token ? "missing" : token.expiresAt && token.expiresAt.getTime() > Date.now() - 60_000 ? "ok" : "expired";

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

      <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">
          Status:{" "}
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {status}
          </span>
        </p>
        <p className="mt-3 text-sm text-slate-600">
          This page confirms whether your Google token is available for creating calendar events.
          If status is <span className="font-semibold">missing</span> or <span className="font-semibold">expired</span>,
          sign out and sign in again with Google (and ensure the right OAuth scopes are granted).
        </p>
        <p className="mt-4 text-xs text-slate-500">
          Event creation endpoint: <code className="rounded bg-slate-100 px-1">POST /api/calendar/events</code>
        </p>
      </div>
    </div>
  );
}

