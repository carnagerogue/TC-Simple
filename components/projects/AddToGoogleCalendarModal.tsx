"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { signIn } from "next-auth/react";

type StatusResponse = {
  status: "ok" | "missing" | "missing_scope" | "expired" | "unauthorized" | "unknown";
  error?: string;
};

type Props = {
  open: boolean;
  taskId: string;
  taskTitle: string;
  dueDate: string;
  projectId: string;
  projectName: string;
  projectAddress?: string | null;
  onClose: () => void;
};

const defaultTime = "09:00";
const defaultDuration = 30;

function buildDateTime(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split("-").map((val) => Number(val));
  const [hour, minute] = timeValue.split(":").map((val) => Number(val));
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function AddToGoogleCalendarModal({
  open,
  taskId,
  taskTitle,
  dueDate,
  projectId,
  projectName,
  projectAddress,
  onClose,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [dateValue, setDateValue] = useState(dueDate);
  const [timeValue, setTimeValue] = useState(defaultTime);
  const [durationMinutes, setDurationMinutes] = useState(defaultDuration);
  const [status, setStatus] = useState<StatusResponse>({ status: "unknown" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventLink, setEventLink] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setDateValue(dueDate);
    setTimeValue(defaultTime);
    setDurationMinutes(defaultDuration);
    setError(null);
    setEventLink(null);
    let cancelled = false;
    fetch("/api/google/status", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: StatusResponse) => {
        if (cancelled) return;
        setStatus(data);
      })
      .catch(() => {
        if (cancelled) return;
        setStatus({ status: "unknown", error: "Unable to check Google connection." });
      });
    return () => {
      cancelled = true;
    };
  }, [open, dueDate]);

  const description = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = origin ? `${origin}/projects/${projectId}/tasks?taskId=${taskId}` : `/projects/${projectId}/tasks`;
    const lines = [
      `Project: ${projectName}`,
      projectAddress ? `Property: ${projectAddress}` : null,
      `Task: ${taskTitle}`,
      `Link: ${link}`,
    ].filter(Boolean) as string[];
    return lines.join("\n");
  }, [projectName, projectAddress, projectId, taskId, taskTitle]);

  if (!open || !mounted) return null;

  const canAdd = status.status === "ok";

  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm">
      <div className="modal-container fixed left-1/2 top-1/2 z-[9999] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Calendar</p>
            <h3 className="text-lg font-semibold text-slate-900">Add to Google Calendar?</h3>
            <p className="mt-1 text-xs text-slate-500">{taskTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {!canAdd ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
              <p>Connect Google to add events.</p>
              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl: `/projects/${projectId}/tasks` })}
                className="mt-3 rounded-lg bg-[#0275ff] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0169e6]"
              >
                Connect Google
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Date
                  <input
                    type="date"
                    value={dateValue}
                    onChange={(e) => setDateValue(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Time
                  <input
                    type="time"
                    value={timeValue}
                    onChange={(e) => setTimeValue(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
                  />
                </label>
              </div>
              <label className="text-xs font-semibold text-slate-600">
                Duration (minutes)
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
                />
              </label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <p className="font-semibold text-slate-700">Description</p>
                <pre className="mt-2 whitespace-pre-wrap text-[11px] text-slate-600">{description}</pre>
              </div>
            </>
          )}
        </div>

        {error ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        ) : null}
        {eventLink ? (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Event created.{" "}
            <a href={eventLink} target="_blank" rel="noreferrer" className="font-semibold underline">
              Open event →
            </a>
          </div>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Skip
          </button>
          <button
            type="button"
            disabled={!canAdd || saving || !dateValue || !timeValue}
            onClick={async () => {
              setSaving(true);
              setError(null);
              try {
                const start = buildDateTime(dateValue, timeValue);
                const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
                const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const res = await fetch("/api/google/calendar/events", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    summary: taskTitle,
                    description,
                    start: start.toISOString(),
                    end: end.toISOString(),
                    timeZone,
                  }),
                });
                const body = await res.json().catch(() => ({}));
                if (!res.ok) {
                  throw new Error(body.error || "Unable to create calendar event.");
                }
                setEventLink(body.htmlLink || null);
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : "Unable to create calendar event.");
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-lg bg-[#0275ff] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0169e6] disabled:opacity-60"
          >
            {saving ? "Adding..." : "Add to Calendar"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
