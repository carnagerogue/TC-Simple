"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ParsedItemCard } from "@/components/ParsedItemCard";
import { ProjectTaskCard } from "@/components/projects/ProjectTaskCard";
import { ProjectCreateModal } from "@/components/ProjectCreateModal";
import { generateTasksFromParsed } from "@/lib/taskGenerator";
import { labelForField } from "@/lib/projectTaskTemplates";

type ParsedItem = {
  field: string;
  label: string;
  value: string | string[];
  selected: boolean;
};

type GeneratedTask = {
  title: string;
  dueDate: Date | null;
  requiresEmail: boolean;
  emailRecipientRole: "buyer" | "seller" | "lender" | "title_company" | null;
  selected: boolean;
  tags?: string;
};

function formatTags(t: GeneratedTask) {
  if (t.tags) return t.tags;
  if (t.requiresEmail && t.emailRecipientRole) return `email,to:${t.emailRecipientRole}`;
  if (t.requiresEmail) return "email";
  return "no-email";
}

function renderTagPills(tags?: string) {
  if (!tags) return null;
  const parts = tags
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && p !== "no-email");
  const colorFor = (tag: string) => {
    switch (tag) {
      case "confirm":
      case "review":
        return "bg-emerald-100 text-emerald-700";
      case "email":
        return "bg-[#eaf2ff] text-[#1b4c96]";
      case "call":
        return "bg-orange-100 text-orange-700";
      case "buyer":
      case "seller":
        return "bg-purple-100 text-purple-700";
      case "title":
      case "title_company":
        return "bg-sky-100 text-sky-700";
      case "request":
        return "bg-amber-100 text-amber-700";
      case "reminder":
        return "bg-pink-100 text-pink-700";
      case "coordinate":
        return "bg-lime-100 text-lime-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };
  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {parts.map((tag) => (
        <span key={tag} className={`rounded-full px-2 py-1 text-[11px] font-semibold ${colorFor(tag)}`}>
          {tag}
        </span>
      ))}
    </div>
  );
}

export default function NewProjectPage() {
  const router = useRouter();
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [tasks, setTasks] = useState<GeneratedTask[]>([]);
  const [projectName, setProjectName] = useState("");
  const [modalOpen, setModalOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sourceTransactionId, setSourceTransactionId] = useState<string | null>(null);
  const [sourceDocumentId, setSourceDocumentId] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? sessionStorage.getItem("tc-simple-new-project") : null;
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      const parsedItems: ParsedItem[] = (parsed.items || []).map((p: any) => ({
        field: p.field,
        label: p.label || labelForField(p.field),
        value: p.value,
        selected: p.selected ?? true,
      }));
      setItems(parsedItems);
      setSourceTransactionId(typeof parsed.transactionId === "string" ? parsed.transactionId : null);
      setSourceDocumentId(typeof parsed.documentId === "string" ? parsed.documentId : null);
      const summary = Object.fromEntries(parsedItems.map((i) => [i.field, i.value]));
      const buyer = summary["buyer_name"];
      const address = summary["property_address"];
      const defaultName = [buyer, address].filter(Boolean).join(" / ") || "New Project";
      setProjectName(defaultName);
      const generated = generateTasksFromParsed(
        parsedItems.filter((i) => i.selected).map((i) => ({ field: i.field, value: i.value }))
      ).map((t) => ({
        ...t,
        selected: true,
      }));
      setTasks(generated);
    } catch (e) {
      console.error("Failed to parse stored project data", e);
    }
  }, []);

  const selectedItems = useMemo(() => items.filter((i) => i.selected), [items]);
  const selectedTasks = useMemo(() => tasks.filter((t) => t.selected), [tasks]);

  const handleCreate = async () => {
    if (!projectName.trim() || selectedItems.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName.trim(),
          items: selectedItems.map((i) => ({ field: i.field, value: i.value })),
          transactionId: sourceTransactionId,
          documentId: sourceDocumentId,
          tasks: selectedTasks.map((t) => ({
            title: t.title,
            dueDate: t.dueDate,
            status: "upcoming",
            tags: formatTags(t),
          })),
        }),
      });
      if (!res.ok) {
        console.error("Failed to create project");
        return;
      }
      const data = await res.json();
      sessionStorage.removeItem("tc-simple-new-project");
      router.push(`/projects/${data.projectId}/tasks`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto flex max-w-6xl gap-6 px-6 py-8">
        <div className="flex-1 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Generated Tasks</p>
                <h2 className="text-lg font-semibold text-gray-900">Task List</h2>
              </div>
              <button
                onClick={() => {
                  const allSelected = tasks.every((t) => t.selected);
                  setTasks((prev) => prev.map((t) => ({ ...t, selected: !allSelected })));
                }}
                className="text-sm font-medium text-[#9bc4ff] hover:underline"
              >
                Select All Tasks
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {tasks.map((task, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    setTasks((prev) =>
                      prev.map((t, i) => (i === idx ? { ...t, selected: !t.selected } : t))
                    )
                  }
                  className={`w-full text-left rounded-xl border px-4 py-3 transition ${
                    task.selected
                    ? "border-[#9bc4ff] bg-[#eaf2ff]"
                    : "border-gray-200 bg-white hover:border-[#9bc4ff]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      readOnly
                      checked={task.selected}
                      className="h-4 w-4 rounded border-[#9bc4ff] text-[#9bc4ff]"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                      {task.dueDate ? (
                        <p className="text-xs text-gray-500">
                          Due {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      ) : null}
                      {task.requiresEmail ? (
                        <p className="text-xs text-[#1b4c96]">Email to {task.emailRecipientRole}</p>
                      ) : null}
                      {renderTagPills(task.tags)}
                    </div>
                  </div>
                </button>
              ))}
              {tasks.length === 0 ? (
                <p className="text-sm text-gray-500">No tasks generated.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-4 shadow-md flex justify-end">
        <button
          type="button"
          disabled={selectedItems.length === 0 || selectedTasks.length === 0 || submitting}
          onClick={handleCreate}
          className="rounded-lg bg-[rgb(2,117,255)] px-5 py-2 text-sm font-semibold text-white shadow hover:bg-[#0f6ae8] disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save"}
        </button>
      </div>

      <ProjectCreateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={async (name) => {
          setProjectName(name);
          setModalOpen(false);
        }}
      />
    </div>
  );
}

