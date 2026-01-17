"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";

type StatusResponse =
  | { status: "ok"; expiresAt?: string | Date | null }
  | { status: "expired"; error?: string }
  | { status: "missing" | "unauthorized" | "unknown"; error?: string };

type CalendarEvent = {
  id: string | null;
  summary: string;
  htmlLink: string | null;
  location: string | null;
  start: string | null;
  end: string | null;
  status: string | null;
};

function fmt(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function CalendarClient() {
  const [status, setStatus] = useState<StatusResponse>({ status: "unknown" });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const sres = await fetch("/api/google/status", { cache: "no-store" });
        const sbody = (await sres.json().catch(() => ({}))) as StatusResponse;
        if (!cancelled) setStatus(sbody);

        if (sbody.status !== "ok") {
          if (!cancelled) setEvents([]);
          return;
        }

        const res = await fetch("/api/calendar/upcoming?days=30", { cache: "no-store" });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || "Unable to load calendar events");
        }
        const body = (await res.json()) as { events?: CalendarEvent[] };
        if (!cancelled) setEvents(body.events ?? []);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Unable to load calendar";
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const upcoming = useMemo(() => events.filter((e) => e.status !== "cancelled"), [events]);

  return (
    <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-700">
            Status:{" "}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {status.status}
            </span>
          </p>
          {status.status !== "ok" ? (
            <p className="mt-2 text-sm text-slate-600">
              To show your calendar, reconnect Google so we can read your events.
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Showing your next 30 days of events.</p>
          )}
        </div>

        {status.status !== "ok" ? (
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/calendar" })}
            className="rounded-lg bg-[#0275ff] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0169e6]"
          >
            Reconnect Google
          </button>
        ) : (
          <a
            href="https://calendar.google.com/calendar/u/0/r"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Open in Google Calendar
          </a>
        )}
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading…</p>
      ) : status.status !== "ok" ? null : (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-[1.2fr_1fr] bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
            <div>Event</div>
            <div>When</div>
          </div>
          <div className="divide-y divide-slate-200">
            {upcoming.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500">No upcoming events found.</div>
            ) : (
              upcoming.map((e) => (
                <div key={e.id ?? `${e.summary}-${e.start ?? ""}`} className="grid grid-cols-[1.2fr_1fr] gap-4 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{e.summary}</p>
                    {e.location ? <p className="text-xs text-slate-500">{e.location}</p> : null}
                    {e.htmlLink ? (
                      <a className="text-xs font-semibold text-[#1b4c96] hover:underline" href={e.htmlLink} target="_blank" rel="noreferrer">
                        View event →
                      </a>
                    ) : null}
                  </div>
                  <div className="text-sm text-slate-700">
                    <div>{fmt(e.start)}</div>
                    {e.end ? <div className="text-xs text-slate-500">to {fmt(e.end)}</div> : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

