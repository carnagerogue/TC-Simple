"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.js`;

type Props = {
  url: string;
  zoom?: number;
};

type PdfDoc = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<{
    getViewport: (opts: { scale: number }) => { width: number; height: number };
    render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => {
      promise: Promise<void>;
      cancel?: () => void;
    };
  }>;
  destroy?: () => void;
};

export function PdfSinglePagePreview({ url, zoom = 0.78 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<{ cancel?: () => void } | null>(null);
  const scrollLockRef = useRef(0);
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canPrev = pageNumber > 1;
  const canNext = numPages > 0 && pageNumber < numPages;

  const containerStyle = useMemo(
    () =>
      pageSize
        ? { height: `${pageSize.height}px` }
        : { height: "520px" },
    [pageSize]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPageNumber(1);
    setNumPages(0);
    setPageSize(null);

    const task = pdfjsLib.getDocument(url);
    task.promise
      .then((loaded) => {
        if (cancelled) {
          loaded.destroy?.();
          return;
        }
        setDoc(loaded as PdfDoc);
        setNumPages(loaded.numPages);
        setPageNumber(1);
      })
      .catch((err) => {
        console.error("[pdf-preview] failed to load", err);
        setError("Unable to load PDF preview.");
      })
      .finally(() => setLoading(false));

    return () => {
      cancelled = true;
      task.destroy?.();
    };
  }, [url]);

  useEffect(() => {
    if (!doc || !canvasRef.current) return;
    let cancelled = false;

    const render = async () => {
      setLoading(true);
      setError(null);
      const page = await doc.getPage(pageNumber);
      if (cancelled || !canvasRef.current) return;
      const viewport = page.getViewport({ scale: zoom });
      setPageSize({ width: viewport.width, height: viewport.height });

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) {
        setError("Unable to render PDF preview.");
        return;
      }
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      renderTaskRef.current?.cancel?.();
      const task = page.render({ canvasContext: context, viewport });
      renderTaskRef.current = task;
      await task.promise;
      setLoading(false);
    };

    render().catch((err) => {
      console.error("[pdf-preview] render error", err);
      setError("Unable to render PDF preview.");
      setLoading(false);
    });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel?.();
    };
  }, [doc, pageNumber, zoom]);

  const goPrev = useCallback(() => setPageNumber((p) => Math.max(1, p - 1)), []);
  const goNext = useCallback(() => setPageNumber((p) => Math.min(numPages || 1, p + 1)), [numPages]);

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (numPages <= 1) return;
    event.preventDefault();
    const now = Date.now();
    if (now - scrollLockRef.current < 350) return;
    scrollLockRef.current = now;
    if (event.deltaY > 8 && canNext) goNext();
    if (event.deltaY < -8 && canPrev) goPrev();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 text-xs text-slate-600">
        <span>Page {numPages ? `${pageNumber} / ${numPages}` : "—"}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={!canPrev}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canNext}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <div
        onWheel={handleWheel}
        tabIndex={0}
        className="flex w-full items-start justify-center overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9bc4ff]"
        style={containerStyle}
        aria-label="PDF preview"
      >
        {error ? (
          <div className="flex h-full w-full items-center justify-center text-xs text-red-600">{error}</div>
        ) : loading ? (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">Rendering...</div>
        ) : (
          <canvas ref={canvasRef} className="block" />
        )}
      </div>
    </div>
  );
}
