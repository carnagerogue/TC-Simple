import { nanoid } from "nanoid";

export type ParsedTaskItem = {
  id: string;
  label: string;
  checked: boolean;
};

export function parseTasks(tasks: unknown): ParsedTaskItem[] {
  if (!Array.isArray(tasks)) return [];

  return tasks
    .map((t) => {
      if (typeof t === "string") return t.trim();
      if (t && typeof t === "object" && "title" in t) {
        const title = (t as any).title;
        return typeof title === "string" ? title.trim() : "";
      }
      return "";
    })
    .filter((t) => t.length > 0)
    .map((label) => ({
      id: nanoid(),
      label,
      checked: true,
    }));
}

