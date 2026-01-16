"use client";

import { useState } from "react";

type Status =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success" }
  | { state: "error"; message: string };

const initialStatus: Status = { state: "idle" };

export function ReminderEmailForm() {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("Upcoming transaction milestone");
  const [body, setBody] = useState(
    "Hi team,<br/><br/>Here is a reminder about our upcoming milestone. Let me know if anything needs attention.<br/><br/>Thanks,<br/>TC Simple",
  );
  const [status, setStatus] = useState<Status>(initialStatus);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus({ state: "loading" });

    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to
            .split(",")
            .map((email) => email.trim())
            .filter(Boolean),
          cc: cc
            .split(",")
            .map((email) => email.trim())
            .filter(Boolean),
          subject,
          body,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to send email.");
      }

      setStatus({ state: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      setStatus({ state: "error", message });
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Communication</p>
        <h3 className="text-xl font-semibold text-slate-900">Send a Gmail reminder</h3>
        <p className="text-sm text-slate-600">
          Email everyone involved with context-rich status updates that drop directly into their
          inboxes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="to">
            To (comma separated emails)
          </label>
          <input
            id="to"
            type="text"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="cc">
            CC (optional)
          </label>
          <input
            id="cc"
            type="text"
            value={cc}
            onChange={(event) => setCc(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="subject">
            Subject
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="body">
            Message
          </label>
          <textarea
            id="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={5}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={status.state === "loading"}
          className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status.state === "loading" ? "Sending..." : "Send email"}
        </button>

        {status.state === "error" ? (
          <p className="text-sm text-red-600">{status.message}</p>
        ) : null}
        {status.state === "success" ? (
          <p className="text-sm text-emerald-600">Email sent with Gmail.</p>
        ) : null}
      </form>
    </section>
  );
}

