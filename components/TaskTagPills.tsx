"use client";

import { getTaskTags } from "@/lib/taskTags";
import { extractEmailRolesFromTags, getEmailTagMeta } from "@/lib/emailTagging";

type Props = {
  tags?: string | null;
  className?: string;
};

export function TaskTagPills({ tags, className }: Props) {
  const pills = getTaskTags(tags);
  const emailRoles = extractEmailRolesFromTags(tags);
  const emailPills = emailRoles.map((role) => getEmailTagMeta(role));
  if (pills.length === 0 && emailPills.length === 0) return null;

  return (
    <div className={`mt-1 flex flex-wrap gap-2 ${className || ""}`.trim()}>
      {emailPills.map((tag) => (
        <span
          key={tag.role}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${tag.className}`}
        >
          <span aria-hidden>✉</span>
          {tag.label}
        </span>
      ))}
      {pills.map((tag) => (
        <span key={tag.id} className={`rounded-full px-2 py-1 text-[11px] font-semibold ${tag.className}`}>
          {tag.label}
        </span>
      ))}
    </div>
  );
}
