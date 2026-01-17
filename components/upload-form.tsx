"use client";

import { useState, useCallback, DragEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ParsedItemCard } from "@/components/ParsedItemCard";
import { labelForField } from "@/lib/projectTaskTemplates";
import { ParsedTaskList } from "@/components/ParsedTaskList";
import { parseTasks, ParsedTaskItem } from "@/utils/parseTasks";
import { PdfSinglePagePreview } from "@/components/PdfSinglePagePreview";
import type { ExtractedProvisions } from "@/lib/parser/provisionsTypes";

type UploadStatus =
  | { type: "idle"; message: "" }
  | { type: "loading"; message: string }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

const initialStatus: UploadStatus = { type: "idle", message: "" };

type ParsedItem = {
  field: string;
  label: string;
  value: string | string[];
  selected: boolean;
};

function normalizeValue(field: string, value: unknown): string | string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    if (field === "included_items" && value.includes(",")) {
      return value.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return value;
  }
  if (value == null) return "";
  return String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildParsedItems(parsed: Record<string, unknown> | null): ParsedItem[] {
  if (!parsed) return [];
  return Object.entries(parsed)
    .filter(([key, val]) => val !== null && val !== undefined && key !== "tasks" && key !== "extractedProvisions")
    .map(([key, val]) => ({
      field: key,
      label: labelForField(key),
      value: normalizeValue(key, val),
      selected: true,
    }));
}

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>(initialStatus);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [parsedTasks, setParsedTasks] = useState<ParsedTaskItem[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [provisionsPanel, setProvisionsPanel] = useState<{ data: ExtractedProvisions | null } | null>(null);
  const [ctaHighlight, setCtaHighlight] = useState(false);
  const [isRerunningAi, setIsRerunningAi] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const parsedSectionRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const pickFile = (selectedFile: File | null) => {
    setFile(selectedFile);
    setStatus(initialStatus);
    if (selectedFile) {
      const localUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(localUrl);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    pickFile(selectedFile);
  };

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files?.[0] ?? null;
    pickFile(droppedFile);
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setStatus({ type: "error", message: "Please select a PDF file before uploading." });
      return;
    }

    if (file.type !== "application/pdf") {
      setStatus({ type: "error", message: "Only PDF files are supported right now." });
      return;
    }

    setIsUploading(true);
    setStatus({ type: "loading", message: "" });
    setTransactionId(null);
    setDocumentId(null);
    setParsedItems([]);
    setParsedTasks([]);
    setAiNotice(null);
    setProvisionsPanel(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Single-source-of-truth: parse server-side via intake-service (OpenAI) and require it.
      const response = await fetch("/api/upload?requireParse=1", {
        method: "POST",
        body: formData,
      });

      const rawPayload = await response.text().catch(() => "");
      let payload: Record<string, unknown> = {};
      try {
        payload = rawPayload ? (JSON.parse(rawPayload) as Record<string, unknown>) : {};
      } catch {
        payload = {};
      }

      if (!response.ok) {
        const message =
          (typeof payload.error === "string" && payload.error) ||
          (rawPayload && rawPayload.slice(0, 240)) ||
          "Upload failed.";
        throw new Error(message);
      }

      const driveLinks = (payload.driveLinks as { view?: string } | undefined) ?? undefined;
      const driveMsg = driveLinks?.view ? ` View in Drive: ${driveLinks.view}` : "";

      setStatus({
        type: "success",
        message: (() => {
          const msg =
            typeof payload.message === "string" && payload.message
              ? payload.message
              : `Uploaded ${
                  (typeof payload.fileName === "string" && payload.fileName) || file.name
                } successfully.${driveMsg}`;
          return msg;
        })(),
      });
      setFile(null);
      setTransactionId(typeof payload.transactionId === "string" ? payload.transactionId : null);
      setDocumentId(typeof payload.documentId === "string" ? payload.documentId : null);
      const parsedSource =
        payload.parsedData && typeof payload.parsedData === "object" && !Array.isArray(payload.parsedData)
          ? (payload.parsedData as Record<string, unknown>)
          : null;
      if (parsedSource && Object.prototype.hasOwnProperty.call(parsedSource, "extractedProvisions")) {
        const raw = parsedSource.extractedProvisions;
        setProvisionsPanel({ data: isRecord(raw) ? (raw as ExtractedProvisions) : null });
      } else {
        setProvisionsPanel(null);
      }
      if (typeof payload.documentId === "string" && payload.documentId) {
        setPreviewUrl(`/api/documents/${payload.documentId}`);
      }
      setParsedItems(buildParsedItems(parsedSource));
      setParsedTasks(parseTasks(parsedSource?.tasks));
      setTimeout(() => {
        parsedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
      // brief CTA highlight to guide next action
      setTimeout(() => {
        setCtaHighlight(true);
        setTimeout(() => setCtaHighlight(false), 1600);
      }, 200);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong while uploading.";
      setStatus({ type: "error", message });
    } finally {
      setIsUploading(false);
    }
  };

  const rerunAiSuggestions = async () => {
    if (!documentId) return;
    setIsRerunningAi(true);
    setAiNotice(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const body = (await res.json().catch(() => ({}))) as { parsedData?: unknown; error?: string };
      if (!res.ok) {
        throw new Error(body.error || "Unable to re-run AI suggestions.");
      }
      const parsed =
        body.parsedData && typeof body.parsedData === "object" && !Array.isArray(body.parsedData)
          ? (body.parsedData as Record<string, unknown>)
          : null;
      if (parsed && Object.prototype.hasOwnProperty.call(parsed, "extractedProvisions")) {
        const raw = parsed.extractedProvisions;
        setProvisionsPanel({ data: isRecord(raw) ? (raw as ExtractedProvisions) : null });
      } else {
        setProvisionsPanel(null);
      }
      if (parsed?.tasks) {
        setParsedTasks(parseTasks(parsed.tasks));
        setAiNotice("AI suggestions updated. Review before creating the project.");
      } else {
        setAiNotice("AI suggestions updated.");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unable to re-run AI suggestions.";
      setAiNotice(message);
    } finally {
      setIsRerunningAi(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <div className="space-y-4">
      <div>
            <label htmlFor="pdf" className="text-sm font-medium text-slate-700">
              Start a new document
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`mt-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
                isDragging
                  ? "border-emerald-500 bg-emerald-50/60"
                  : "border-slate-300 bg-slate-50/70"
              }`}
            >
          <input
            id="pdf"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="pdf"
                className="block cursor-pointer text-sm font-semibold text-emerald-700 hover:underline"
              >
                Click to browse or drag & drop a PDF
              </label>
              {file ? (
                <p className="mt-2 text-xs text-slate-700">
                  Selected: <span className="font-medium">{file.name}</span>
                </p>
              ) : (
          <p className="mt-3 text-xs text-slate-500">
                  Files are stored securely per user and parsed automatically after upload.
          </p>
              )}
        </div>
      </div>

      <button
        type="submit"
            disabled={isUploading || !file}
            className={`w-full rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-70 ${
              file
                ? "bg-[rgb(2,117,255)] hover:bg-[#0f6ae8] shadow-blue-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f6ae8]"
                : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            }`}
          >
            {isUploading ? "Uploading…" : file ? "Extract" : "Upload PDF"}
      </button>

          {status.type !== "idle" && status.type !== "success" ? (
            <div
          className={`rounded-xl px-4 py-3 text-sm ${
                status.type === "loading"
                  ? "bg-blue-50 text-blue-700"
              : "bg-red-50 text-red-600"
          }`}
          role="status"
        >
              <div className="flex items-center gap-3">
                {status.type === "loading" ? (
                  <div className="flex flex-col items-center gap-3 w-full">
                    <Image
                      src="/tc-simple%20loading.gif?v=4"
                      alt="Uploading and parsing..."
                      width={320}
                      height={320}
                      unoptimized
                      className="h-[320px] w-[320px] max-h-[400px] max-w-[400px] object-contain"
                    />
                  </div>
                ) : null}
                {status.message ? <span>{status.message}</span> : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-[#9bc4ff] bg-white p-4 shadow-sm h-full">
          <p className="text-sm font-semibold text-slate-700 mb-2">Document Preview</p>
          {previewUrl ? (
            <PdfSinglePagePreview url={previewUrl} zoom={0.78} />
          ) : (
            <p className="text-xs text-slate-500">No preview available.</p>
          )}
        </div>
      </div>

      {status.type === "success" ? (
        <div
          ref={parsedSectionRef}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Parsed Fields</p>
                  <p className="text-xs text-gray-500">
                    Toggle which fields to use for project creation and task generation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const allSelected = parsedItems.every((i) => i.selected);
                    setParsedItems((prev) => prev.map((p) => ({ ...p, selected: !allSelected })));
                  }}
                  className="text-sm font-medium text-[#9bc4ff] hover:underline"
                >
                  Select All
                </button>
              </div>
              <div className="space-y-2">
                {parsedItems.map((item) => (
                  <ParsedItemCard
                    key={item.field}
                    field={item.field}
                    label={item.label}
                    value={item.value}
                    selected={item.selected}
                    onToggle={() =>
                      setParsedItems((prev) =>
                        prev.map((p) => (p.field === item.field ? { ...p, selected: !p.selected } : p))
                      )
                    }
                  />
                ))}
                {parsedItems.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    No fields detected. This usually means the contract text extraction/OCR failed.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              {provisionsPanel ? (
                <details className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" open>
                  <summary className="cursor-pointer list-none text-left">
                    <p className="text-sm font-semibold text-gray-900">Key Contract Provisions (Draft)</p>
                    <p className="text-xs text-gray-500">
                      Extracted from the contract; verify before relying.
                    </p>
                  </summary>
                  <div className="mt-3 space-y-3 text-sm text-slate-700">
                    {provisionsPanel.data ? (
                      <>
                        {provisionsPanel.data.feasibility ? (
                          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Feasibility
                            </p>
                            <p className="mt-1"><span className="font-semibold">Exists:</span> {provisionsPanel.data.feasibility.exists ? "Yes" : "No"}</p>
                            {provisionsPanel.data.feasibility.periodDays ? (
                              <p><span className="font-semibold">Period:</span> {provisionsPanel.data.feasibility.periodDays} days</p>
                            ) : null}
                            {provisionsPanel.data.feasibility.expirationDate ? (
                              <p><span className="font-semibold">Expiration:</span> {provisionsPanel.data.feasibility.expirationDate}</p>
                            ) : null}
                            {provisionsPanel.data.feasibility.requiresNotice !== undefined ? (
                              <p><span className="font-semibold">Requires notice:</span> {provisionsPanel.data.feasibility.requiresNotice ? "Yes" : "No"}</p>
                            ) : null}
                            {provisionsPanel.data.feasibility.source?.quote ? (
                              <p className="text-xs text-slate-500 mt-1">
                                Source{provisionsPanel.data.feasibility.source.page ? ` (page ${provisionsPanel.data.feasibility.source.page})` : ""}: “{provisionsPanel.data.feasibility.source.quote}”
                              </p>
                            ) : null}
                          </div>
                        ) : null}

                        {provisionsPanel.data.promissoryNote ? (
                          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Promissory Note
                            </p>
                            <p className="mt-1"><span className="font-semibold">Exists:</span> {provisionsPanel.data.promissoryNote.exists ? "Yes" : "No"}</p>
                            {provisionsPanel.data.promissoryNote.amount !== undefined ? (
                              <p><span className="font-semibold">Amount:</span> ${provisionsPanel.data.promissoryNote.amount.toLocaleString()}</p>
                            ) : null}
                            {provisionsPanel.data.promissoryNote.dueDate ? (
                              <p><span className="font-semibold">Due date:</span> {provisionsPanel.data.promissoryNote.dueDate}</p>
                            ) : null}
                            {provisionsPanel.data.promissoryNote.payer ? (
                              <p><span className="font-semibold">Payer:</span> {provisionsPanel.data.promissoryNote.payer}</p>
                            ) : null}
                            {provisionsPanel.data.promissoryNote.payee ? (
                              <p><span className="font-semibold">Payee:</span> {provisionsPanel.data.promissoryNote.payee}</p>
                            ) : null}
                            {provisionsPanel.data.promissoryNote.source?.quote ? (
                              <p className="text-xs text-slate-500 mt-1">
                                Source{provisionsPanel.data.promissoryNote.source.page ? ` (page ${provisionsPanel.data.promissoryNote.source.page})` : ""}: “{provisionsPanel.data.promissoryNote.source.quote}”
                              </p>
                            ) : null}
                          </div>
                        ) : null}

                        {provisionsPanel.data.financing ? (
                          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Financing
                            </p>
                            {provisionsPanel.data.financing.type ? (
                              <p><span className="font-semibold">Type:</span> {provisionsPanel.data.financing.type}</p>
                            ) : null}
                            {provisionsPanel.data.financing.deadline ? (
                              <p><span className="font-semibold">Deadline:</span> {provisionsPanel.data.financing.deadline}</p>
                            ) : null}
                            {provisionsPanel.data.financing.source?.quote ? (
                              <p className="text-xs text-slate-500 mt-1">
                                Source{provisionsPanel.data.financing.source.page ? ` (page ${provisionsPanel.data.financing.source.page})` : ""}: “{provisionsPanel.data.financing.source.quote}”
                              </p>
                            ) : null}
                          </div>
                        ) : null}

                        {provisionsPanel.data.contingencies?.length ? (
                          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Contingencies
                            </p>
                            <div className="mt-2 space-y-2">
                              {provisionsPanel.data.contingencies.map((c, idx) => (
                                <div key={`${c.type}-${idx}`} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                                  <p className="font-semibold">{c.type}</p>
                                  {c.deadline ? <p className="text-xs text-slate-600">Deadline: {c.deadline}</p> : null}
                                  {c.source?.quote ? (
                                    <p className="text-xs text-slate-500 mt-1">
                                      Source{c.source.page ? ` (page ${c.source.page})` : ""}: “{c.source.quote}”
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-xs text-slate-500">Unable to extract provisions for this document.</p>
                    )}
                  </div>
                </details>
              ) : null}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">AI Suggested Tasks</p>
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-[10px] font-semibold text-slate-500"
                      title="These are suggested tasks based on the PDF. You can edit them or add your own before creating the project."
                    >
                      i
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Generated from the uploaded PDF. Review, edit, and include only what you want before creating the project.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={rerunAiSuggestions}
                  disabled={!documentId || isRerunningAi}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {isRerunningAi ? "Re-running..." : "Re-run AI suggestions"}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Adding a task here creates a manual task. AI will not re-run unless you click the button above.
              </p>
              {aiNotice ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {aiNotice}
                </div>
              ) : null}
              <ParsedTaskList tasks={parsedTasks} onChange={setParsedTasks} />
            </div>
          </div>
        </div>
      ) : null}

      {/* Removed old follow-up task section */}

      {status.type === "success" && (parsedItems.length > 0 || parsedTasks.some((t) => t.included)) ? (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-md flex justify-end">
          <button
            type="button"
            disabled={
              parsedItems.filter((p) => p.selected).length === 0 &&
              parsedTasks.filter((t) => t.included).length === 0
            }
            onClick={() => {
              const payload = {
                items: parsedItems,
                transactionId,
                documentId,
                tasks: parsedTasks.filter((t) => t.included),
              };
              if (typeof window !== "undefined") {
                sessionStorage.setItem("tc-simple-new-project", JSON.stringify(payload));
              }
              router.push("/new-project");
            }}
            className={`rounded-lg bg-[#0f6ae8] px-5 py-2 text-sm font-semibold text-white shadow hover:bg-[#0c5ecb] disabled:opacity-60 create-glow ${
              ctaHighlight ? "animate-pulse ring-2 ring-[#0f6ae8] ring-offset-2 ring-offset-white" : ""
            }`}
          >
            Create Project
          </button>
        </div>
      ) : null}
      <style jsx global>{`
        @keyframes create-glow {
          0%,
          100% {
            box-shadow: 0 0 10px rgba(2, 117, 255, 0.6), 0 0 20px rgba(2, 117, 255, 0.35);
          }
          50% {
            box-shadow: 0 0 20px rgba(2, 117, 255, 0.75), 0 0 30px rgba(2, 117, 255, 0.5);
          }
        }
        .create-glow {
          animation: create-glow 1.5s ease-in-out infinite;
        }
      `}</style>
    </form>
  );
}

