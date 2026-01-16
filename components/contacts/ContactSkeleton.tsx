"use client";

export function ContactSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-1/4 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="h-6 w-16 animate-pulse rounded-full bg-slate-200" />
    </div>
  );
}


