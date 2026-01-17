"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";

type StatusResponse =
  | { status: "ok"; expiresAt?: string | Date | null }
  | { status: "expired"; error?: string }
  | { status: "missing" | "missing_scope" | "unauthorized" | "unknown"; error?: string };

export function ProjectGoogleCalendarPanel() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<StatusResponse>({ status: "unknown" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/google/status", { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as StatusResponse;
        if (!cancelled) setStatus(body);
      } catch {
        if (!cancelled) setStatus({ status: "unknown" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const embedUrl = useMemo(() => {
    const email = session?.user?.email;
    if (!email) return null;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
    const url = new URL("https://calendar.google.com/calendar/embed");
    url.searchParams.set("src", email);
    url.searchParams.set("ctz", tz);
    url.searchParams.set("mode", "MONTH");
    url.searchParams.set("showTitle", "0");
    url.searchParams.set("showPrint", "0");
    url.searchParams.set("showTabs", "0");
    url.searchParams.set("showCalendars", "0");
    url.searchParams.set("showTz", "0");
    url.searchParams.set("wkst", "1");
    url.searchParams.set("cachebust", String(reloadKey));
    return url.toString();
  }, [session?.user?.email, reloadKey]);

  const isReady = status.status === "ok" && !!embedUrl;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Calendar</p>
          <h3 className="text-lg font-semibold text-slate-900">Google Calendar</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setReloadKey(Date.now())}
            className="rounded-md border border-slate-200 px-2 py-1 font-semibold text-slate-600 hover:bg-slate-50"
          >
            Today
          </button>
          <a
            href="https://calendar.google.com/calendar/u/0/r/eventedit"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-slate-200 px-2 py-1 font-semibold text-slate-600 hover:bg-slate-50"
          >
            Add event
          </a>
          <a
            href="https://calendar.google.com/calendar/u/0/r"
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-[#0275ff] px-2 py-1 font-semibold text-white hover:bg-[#0169e6]"
          >
            Open
          </a>
        </div>
      </div>

      {!isReady ? (
        <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
          <p>Connect Google to view your calendar here.</p>
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/projects" })}
            className="mt-3 rounded-lg bg-[#0275ff] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0169e6]"
          >
            Reconnect Google
          </button>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          <iframe
            title="Google Calendar"
            src={embedUrl}
            className="h-[360px] w-full border-0"
          />
        </div>
      )}
    </div>
  );
}
