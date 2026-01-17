"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.js`;

type Props = {
  url: string;
  zoom?: number;
};

export function PdfSinglePagePreview({ url, zoom = 0.78 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<{ cancel?: () => void } | null>(null);
  const loadTaskRef = useRef<pdfjsLib.PDFDocumentLoadingTask | null>(null);
  const scrollLockRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const needsCenterRef = useRef(true);
  const [visualZoom, setVisualZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [doc, setDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canPrev = pageNumber > 1;
  const canNext = numPages > 0 && pageNumber < numPages;
  const canZoomOut = visualZoom > 0.5;
  const canZoomIn = visualZoom < 3;

  const containerStyle = useMemo(
    () =>
      pageSize
        ? { height: `${pageSize.height}px` }
        : { height: "520px" },
    [pageSize]
  );

  const clampZoom = useCallback((value: number) => Math.min(3, Math.max(0.5, value)), []);

  const getCenteredPan = useCallback(
    (nextZoom: number) => {
      const container = containerRef.current;
      if (!container || !pageSize) return { x: 0, y: 0 };
      const viewportW = container.clientWidth;
      const viewportH = container.clientHeight;
      const contentW = pageSize.width * nextZoom;
      const contentH = pageSize.height * nextZoom;
      return {
        x: (viewportW - contentW) / 2,
        y: (viewportH - contentH) / 2,
      };
    },
    [pageSize]
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setPageNumber(1);
    setNumPages(0);
    setPageSize(null);

    const load = async () => {
      try {
        const resolved = typeof window !== "undefined" ? new URL(url, window.location.href) : null;
        const sameOrigin =
          !!resolved && (resolved.origin === window.location.origin || resolved.protocol === "blob:");
        const response = await fetch(resolved ? resolved.toString() : url, {
          credentials: sameOrigin ? "include" : "omit",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to load PDF (${response.status})`);
        }
        const data = new Uint8Array(await response.arrayBuffer());
        const task = pdfjsLib.getDocument({ data });
        loadTaskRef.current = task;
        const loaded = await task.promise;
        if (cancelled) {
          loaded.destroy?.();
          return;
        }
        setDoc(loaded);
        setNumPages(loaded.numPages);
        setPageNumber(1);
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("[pdf-preview] failed to load", err);
        setError("Unable to load PDF preview.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      controller.abort();
      loadTaskRef.current?.destroy?.();
      loadTaskRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    setVisualZoom(1);
    setPan({ x: 0, y: 0 });
    needsCenterRef.current = true;
  }, [url]);

  useEffect(() => {
    if (!doc || !canvasRef.current) return;
    let cancelled = false;

    const render = async () => {
      setLoading(true);
      setError(null);
      try {
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
      } catch (err) {
        console.error("[pdf-preview] render error", err);
        if (!cancelled) setError("Unable to render PDF preview.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    render();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel?.();
    };
  }, [doc, pageNumber, zoom]);

  useEffect(() => {
    if (!pageSize || !needsCenterRef.current) return;
    const centered = getCenteredPan(1);
    setPan(centered);
    needsCenterRef.current = false;
  }, [pageSize, getCenteredPan]);

  const goPrev = useCallback(() => setPageNumber((p) => Math.max(1, p - 1)), []);
  const goNext = useCallback(() => setPageNumber((p) => Math.min(numPages || 1, p + 1)), [numPages]);

  const applyZoomAtPoint = useCallback(
    (nextZoomRaw: number, clientX?: number, clientY?: number) => {
      const container = containerRef.current;
      const nextZoom = clampZoom(nextZoomRaw);
      if (!container) {
        setVisualZoom(nextZoom);
        return;
      }
      const rect = container.getBoundingClientRect();
      const mouseX = typeof clientX === "number" ? clientX - rect.left : rect.width / 2;
      const mouseY = typeof clientY === "number" ? clientY - rect.top : rect.height / 2;
      const prevZoom = visualZoom;
      const contentX = (mouseX - pan.x) / prevZoom;
      const contentY = (mouseY - pan.y) / prevZoom;
      const nextPanX = mouseX - contentX * nextZoom;
      const nextPanY = mouseY - contentY * nextZoom;
      setVisualZoom(nextZoom);
      setPan({ x: nextPanX, y: nextPanY });
    },
    [clampZoom, pan, visualZoom]
  );

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey) {
      event.preventDefault();
      const direction = event.deltaY > 0 ? -0.1 : 0.1;
      const next = clampZoom(Number((visualZoom + direction).toFixed(2)));
      applyZoomAtPoint(next, event.clientX, event.clientY);
      return;
    }
    if (visualZoom > 1) {
      event.preventDefault();
      setPan((prev) => ({
        x: prev.x - event.deltaX,
        y: prev.y - event.deltaY,
      }));
      return;
    }
    if (numPages <= 1) return;
    event.preventDefault();
    const now = Date.now();
    if (now - scrollLockRef.current < 350) return;
    scrollLockRef.current = now;
    if (event.deltaY > 8 && canNext) goNext();
    if (event.deltaY < -8 && canPrev) goPrev();
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (visualZoom <= 1 || !containerRef.current) return;
    event.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = event.clientX - dragStartRef.current.x;
      const dy = event.clientY - dragStartRef.current.y;
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      });
    };
    const handleUp = () => {
      dragStartRef.current = null;
      setIsDragging(false);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 text-xs text-slate-600">
        <span>Page {numPages ? `${pageNumber} / ${numPages}` : "—"}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = clampZoom(Number((visualZoom - 0.1).toFixed(2)));
              applyZoomAtPoint(next);
            }}
            disabled={!canZoomOut}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            title="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => {
              const centered = getCenteredPan(1);
              setVisualZoom(1);
              setPan(centered);
            }}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            title="Reset zoom"
          >
            Reset
          </button>
          <span className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600">
            {Math.round(visualZoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => {
              const next = clampZoom(Number((visualZoom + 0.1).toFixed(2)));
              applyZoomAtPoint(next);
            }}
            disabled={!canZoomIn}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            title="Zoom in"
          >
            +
          </button>
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
        onMouseDown={handleMouseDown}
        tabIndex={0}
        ref={containerRef}
        className={`relative w-full overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9bc4ff] ${
          visualZoom > 1 ? "cursor-grab select-none" : ""
        } ${isDragging ? "cursor-grabbing" : ""}`}
        style={{ ...containerStyle, WebkitOverflowScrolling: "touch" }}
        aria-label="PDF preview"
      >
        <div
          className="absolute left-0 top-0 transition-transform duration-150"
          style={{
            width: pageSize?.width ? `${pageSize.width}px` : "100%",
            height: pageSize?.height ? `${pageSize.height}px` : "100%",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${visualZoom})`,
            transformOrigin: "top left",
          }}
        >
          <canvas ref={canvasRef} className="block" />
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-xs text-red-600">
              {error}
            </div>
          ) : loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs text-slate-500">
              Rendering...
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
