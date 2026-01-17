"use client";

import { getTaskTags } from "@/lib/taskTags";

type Props = {
  tags?: string | null;
  className?: string;
};

export function TaskTagPills({ tags, className }: Props) {
  const pills = getTaskTags(tags);
  if (pills.length === 0) return null;

  return (
    <div className={`mt-1 flex flex-wrap gap-2 ${className || ""}`.trim()}>
      {pills.map((tag) => (
        <span key={tag.id} className={`rounded-full px-2 py-1 text-[11px] font-semibold ${tag.className}`}>
          {tag.label}
        </span>
      ))}
    </div>
  );
}
