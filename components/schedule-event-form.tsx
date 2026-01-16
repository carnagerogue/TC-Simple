"use client";

import { useState } from "react";

type Status =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success"; link?: string }
  | { state: "error"; message: string };

const initialStatus: Status = { state: "idle" };

export function ScheduleEventForm() {
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [attendees, setAttendees] = useState("");
  const [status, setStatus] = useState<Status>(initialStatus);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus({ state: "loading" });

    try {
      const response = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary,
          description,
          location,
          start: start ? new Date(start).toISOString() : undefined,
          end: end ? new Date(end).toISOString() : undefined,
          attendees: attendees
            .split(",")
            .map((email) => email.trim())
            .filter(Boolean),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to schedule event.");
      }

      setStatus({ state: "success", link: payload.htmlLink });
      setSummary("");
      setDescription("");
      setLocation("");
      setStart("");
      setEnd("");
      setAttendees("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      setStatus({ state: "error", message });
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Timeline</p>
        <h3 className="text-xl font-semibold text-slate-900">Create a Google Calendar event</h3>
        <p className="text-sm text-slate-600">
          Auto-sync walkthroughs, inspections, or contingencies with clients and vendors.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="summary">
            Event name
          </label>
          <input
            id="summary"
            type="text"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="start">
              Starts
            </label>
            <input
              id="start"
              type="datetime-local"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="end">
              Ends
            </label>
            <input
              id="end"
              type="datetime-local"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="location">
            Location (optional)
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="attendees">
            Attendees (comma separated emails)
          </label>
          <input
            id="attendees"
            type="text"
            value={attendees}
            onChange={(event) => setAttendees(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="description">
            Notes (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={status.state === "loading"}
          className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status.state === "loading" ? "Syncing with Google Calendar..." : "Save to Calendar"}
        </button>

        {status.state === "error" ? (
          <p className="text-sm text-red-600">{status.message}</p>
        ) : null}
        {status.state === "success" ? (
          <p className="text-sm text-emerald-600">
            Event created!{" "}
            {status.link ? (
              <a
                href={status.link}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Open in Google Calendar
              </a>
            ) : null}
          </p>
        ) : null}
      </form>
    </section>
  );
}

