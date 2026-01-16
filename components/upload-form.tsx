"use client";

import { useState, useCallback, DragEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import { ParsedItemCard } from "@/components/ParsedItemCard";
import { labelForField } from "@/lib/projectTaskTemplates";

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

type ParserResponse = {
  fields?: Record<string, unknown>;
  extracted?: Record<string, unknown>;
  tasks?: string[];
  choices?: Array<{ message?: { content?: string } }>;
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

function buildParsedItems(parsed: Record<string, unknown> | null): ParsedItem[] {
  if (!parsed) return [];
  return Object.entries(parsed)
    .filter(([key, val]) => val !== null && val !== undefined && key !== "tasks")
    .map(([key, val]) => ({
      field: key,
      label: labelForField(key),
      value: normalizeValue(key, val),
      selected: true,
    }));
}

async function uploadToParser(file: File) {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/parser", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Parser request failed");
  }

  return res.json();
}

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>(initialStatus);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ctaHighlight, setCtaHighlight] = useState(false);
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

    try {
      // Call FastAPI parser first
      const parsed = (await uploadToParser(file)) as ParserResponse;
      // handle raw OpenAI-like response with choices or wrapped fields
      let extracted: Record<string, unknown> | null = parsed.fields ?? parsed.extracted ?? null;
      if (!extracted && parsed?.choices) {
        const raw = parsed.choices?.[0]?.message?.content ?? "";
        try {
          extracted = JSON.parse(raw.replace(/```json|```/g, ""));
        } catch (e) {
          extracted = null;
        }
      }
      setParsedItems(buildParsedItems(extracted));

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      const driveMsg = payload.driveLinks?.view
        ? ` View in Drive: ${payload.driveLinks.view}`
        : "";

      setStatus({
        type: "success",
        message:
          payload.message ??
          `Uploaded ${payload.fileName ?? file.name} successfully.${driveMsg}`,
      });
      setFile(null);
      setTransactionId(payload.transactionId ?? null);
      setDocumentId(payload.documentId ?? null);
      const parsedSource = extracted || payload.parsedData || null;
      if (payload.documentId) {
        setPreviewUrl(`/api/documents/${payload.documentId}`);
      }
      setParsedItems(buildParsedItems(parsedSource));
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
                    <img
                      src="/tc-simple%20loading.gif?v=4"
                      alt="Uploading and parsing..."
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
            <object
              data={previewUrl}
              type="application/pdf"
              className="w-full h-[90vh]"
              style={{ objectFit: "contain" }}
            >
              <p className="p-3 text-xs text-slate-500">
                Preview not supported.{" "}
                <a className="text-[#377ddf] underline" href={previewUrl} target="_blank">
                  Open PDF
                </a>
              </p>
            </object>
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Parsed Items</p>
              <p className="text-xs text-gray-500">
                Toggle which parsed items to convert into a project and tasks.
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
                    prev.map((p) =>
                      p.field === item.field ? { ...p, selected: !p.selected } : p
                    )
                  )
                }
              />
            ))}
            {parsedItems.length === 0 ? (
              <p className="text-xs text-gray-500">No parsed items found.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Removed old follow-up task section */}

      {status.type === "success" && parsedItems.length > 0 ? (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-md flex justify-end">
          <button
            type="button"
            disabled={parsedItems.filter((p) => p.selected).length === 0}
            onClick={() => {
              const payload = {
                items: parsedItems,
                transactionId,
                documentId,
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

