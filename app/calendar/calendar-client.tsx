"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
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

type DeadlineItem = {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  tags: string | null;
  project: { id: string; name: string };
};

function fmt(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function CalendarClient() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<StatusResponse>({ status: "unknown" });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<Record<string, { ok: boolean; link?: string; error?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"embed" | "agenda">("embed");
  const [embedMode, setEmbedMode] = useState<"MONTH" | "WEEK" | "AGENDA">("MONTH");

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
          if (!cancelled) setDeadlines([]);
          return;
        }

        const [res, dres] = await Promise.all([
          fetch("/api/calendar/upcoming?days=30", { cache: "no-store" }),
          fetch("/api/calendar/deadlines?days=60", { cache: "no-store" }),
        ]);
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || "Unable to load calendar events");
        }
        const body = (await res.json()) as { events?: CalendarEvent[] };
        if (!cancelled) setEvents(body.events ?? []);

        if (dres.ok) {
          const dbody = (await dres.json()) as { deadlines?: DeadlineItem[] };
          if (!cancelled) setDeadlines(dbody.deadlines ?? []);
        }
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
  const upcomingDeadlines = useMemo(() => {
    const now = Date.now();
    return deadlines
      .filter((d) => d.dueDate && new Date(d.dueDate).getTime() >= now - 24 * 60 * 60 * 1000)
      .sort((a, b) => new Date(a.dueDate ?? 0).getTime() - new Date(b.dueDate ?? 0).getTime());
  }, [deadlines]);

  const embedUrl = useMemo(() => {
    const email = session?.user?.email;
    if (!email) return null;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
    const url = new URL("https://calendar.google.com/calendar/embed");
    url.searchParams.set("src", email);
    url.searchParams.set("ctz", tz);
    url.searchParams.set("mode", embedMode);
    url.searchParams.set("showTitle", "0");
    url.searchParams.set("showPrint", "0");
    url.searchParams.set("showTabs", "0");
    url.searchParams.set("showCalendars", "0");
    url.searchParams.set("showTz", "0");
    url.searchParams.set("wkst", "1");
    return url.toString();
  }, [session?.user?.email, embedMode]);

  async function syncDeadlineToGoogle(d: DeadlineItem) {
    if (!d.dueDate) return;
    setSyncingId(d.id);
    setSyncResult((prev) => ({ ...prev, [d.id]: { ok: false } }));
    try {
      const start = new Date(d.dueDate);
      // default: 9:00–9:30 local time on due date (if dueDate is midnight UTC, this still yields a valid ISO)
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: `${d.project.name}: ${d.title}`,
          description:
            `Created from TC Simple\n\nProject: ${d.project.name}\nTask: ${d.title}\n` +
            (d.tags ? `Tags: ${d.tags}\n` : ""),
          start: start.toISOString(),
          end: end.toISOString(),
          kind: "project",
          taskId: d.id,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { htmlLink?: string; error?: string };
      if (!res.ok) throw new Error(body.error || "Unable to create calendar event");
      setSyncResult((prev) => ({ ...prev, [d.id]: { ok: true, link: body.htmlLink } }));
    } catch (e: unknown) {
      setSyncResult((prev) => ({
        ...prev,
        [d.id]: { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      }));
    } finally {
      setSyncingId(null);
    }
  }

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
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full bg-slate-100 p-1 text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setTab("embed")}
                className={`rounded-full px-3 py-1 ${tab === "embed" ? "bg-white shadow text-slate-900" : ""}`}
              >
                Embedded
              </button>
              <button
                type="button"
                onClick={() => setTab("agenda")}
                className={`rounded-full px-3 py-1 ${tab === "agenda" ? "bg-white shadow text-slate-900" : ""}`}
              >
                Agenda + Deadlines
              </button>
            </div>
            <a
              href="https://calendar.google.com/calendar/u/0/r"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Open in Google Calendar
            </a>
          </div>
        )}
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading…</p>
      ) : status.status !== "ok" ? null : tab === "embed" ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold text-slate-600">
              Embedded Google Calendar (requires you to be signed into Google in this browser)
            </p>
            <div className="rounded-full bg-white p-1 text-xs font-semibold text-slate-600">
              {(["MONTH", "WEEK", "AGENDA"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setEmbedMode(m)}
                  className={`rounded-full px-3 py-1 ${embedMode === m ? "bg-slate-900 text-white" : ""}`}
                >
                  {m === "MONTH" ? "Month" : m === "WEEK" ? "Week" : "Agenda"}
                </button>
              ))}
            </div>
          </div>

          {embedUrl ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
              <iframe
                title="Google Calendar"
                src={embedUrl}
                className="h-[78vh] w-full bg-white"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Unable to embed because your Google email isn’t available in session. Try logging out and back in.
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[1.2fr_1fr] bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
              <div>Google Events</div>
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
                        <a
                          className="text-xs font-semibold text-[#1b4c96] hover:underline"
                          href={e.htmlLink}
                          target="_blank"
                          rel="noreferrer"
                        >
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

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="flex items-center justify-between bg-slate-50 px-4 py-2">
              <div>
                <p className="text-xs font-semibold text-slate-600">TC Simple Deadlines</p>
                <p className="text-[11px] text-slate-500">Upcoming project task due dates (sync into Google)</p>
              </div>
            </div>
            <div className="divide-y divide-slate-200">
              {upcomingDeadlines.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-500">No upcoming task deadlines found.</div>
              ) : (
                upcomingDeadlines.slice(0, 50).map((d) => {
                  const r = syncResult[d.id];
                  return (
                    <div key={d.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{d.title}</p>
                          <p className="text-xs text-slate-500">{d.project.name}</p>
                          <p className="mt-1 text-xs text-slate-600">{fmt(d.dueDate)}</p>
                          {r?.ok && r.link ? (
                            <a className="mt-1 block text-xs font-semibold text-[#1b4c96] hover:underline" href={r.link} target="_blank" rel="noreferrer">
                              Open created event →
                            </a>
                          ) : null}
                          {r?.error ? <p className="mt-1 text-xs text-red-600">{r.error}</p> : null}
                        </div>
                        <button
                          type="button"
                          disabled={!d.dueDate || syncingId === d.id}
                          onClick={() => syncDeadlineToGoogle(d)}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-slate-800 disabled:opacity-60"
                        >
                          {syncingId === d.id ? "Adding…" : "Add to Google"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

