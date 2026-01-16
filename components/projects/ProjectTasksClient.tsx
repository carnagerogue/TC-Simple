"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProjectTaskCard } from "./ProjectTaskCard";
import { TagEditModal } from "./TagEditModal";
import { ProjectSidebar } from "./ProjectSidebar";
import { ProjectStakeholderList, Stakeholder } from "./ProjectStakeholderList";
import { TaskDetailModal } from "./TaskDetailModal";
import { EmailDraftModal } from "./EmailDraftModal";
import { extractRoleFromTags, tagsIncludeEmail, renderTemplate, normalizeRoleToStakeholder } from "@/lib/emailHelpers";

type Task = {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  tags?: string | null;
  notes?: string | null;
  description?: string | null;
  template?: string | null;
  priority?: boolean;
};

type Project = {
  id: string;
  name: string;
  summary: Record<string, string | number | null | undefined> | null;
  myClientRole?: "BUYER" | "SELLER" | null;
};

type Props = {
  projectId: string;
  initialProject: Project;
  initialTasks: Task[];
};

export function ProjectTasksClient({ projectId, initialProject, initialTasks }: Props) {
  const [project, setProject] = useState<Project>(initialProject);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [tagModal, setTagModal] = useState<{ open: boolean; taskId: string | null; tags: string }>({
    open: false,
    taskId: null,
    tags: "",
  });
  const [detailModal, setDetailModal] = useState<{ open: boolean; task: Task | null }>({
    open: false,
    task: null,
  });
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [myClientRole, setMyClientRole] = useState<"BUYER" | "SELLER" | null>(initialProject.myClientRole ?? null);
  const [clientWarning, setClientWarning] = useState<string | null>(null);
  const [updatingClient, setUpdatingClient] = useState(false);
  const [stakeholderRefreshKey, setStakeholderRefreshKey] = useState(0);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [forceStakeholderModal, setForceStakeholderModal] = useState(false);
  const [draftModal, setDraftModal] = useState<{
    open: boolean;
    recipient?: { email?: string | null; name?: string; roleLabel?: string };
    subject?: string;
    body?: string;
    tags?: string;
    contextRole?: string | null;
  }>({ open: false });
  const router = useRouter();

  const updateMyClientRole = async (role: "BUYER" | "SELLER") => {
    setUpdatingClient(true);
    setClientWarning(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/my-client`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        myClientRole?: "BUYER" | "SELLER" | null;
        hasStakeholder?: boolean;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Unable to update client");
      }
      setMyClientRole(data.myClientRole ?? role);
      if (!data.hasStakeholder) {
        setClientWarning(`No ${role === "BUYER" ? "buyer" : "seller"} stakeholder added yet. Add one to route emails.`);
      } else {
        setClientWarning(null);
      }
      setStakeholderRefreshKey((k) => k + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to update client";
      setClientWarning(msg);
    } finally {
      setUpdatingClient(false);
    }
  };

  const findRecipientForTask = (task: Task) => {
    if (!tagsIncludeEmail(task.tags)) return null;
    const roleTag = extractRoleFromTags(task.tags);
    const normalized = normalizeRoleToStakeholder(roleTag?.toUpperCase()) || normalizeRoleToStakeholder(roleTag || "");
    if (!normalized) return null;
    const pickBest = (role: string) => {
      const candidates = stakeholders.filter((s) => s.role === role);
      if (!candidates.length) return null;
      if (role === "BUYER" || role === "SELLER") {
        const client = candidates.find((c) => c.contact.category === "CLIENT");
        if (client) return client;
      }
      if (role === "BUYER_AGENT" || role === "SELLER_AGENT") {
        const agent = candidates.find((c) => c.contact.category === "AGENT");
        if (agent) return agent;
      }
      return candidates[0];
    };

    let match = pickBest(normalized);

    // Smart fallbacks between party and agent roles
    if (!match) {
      const fallbackRole =
        normalized === "BUYER"
          ? "BUYER_AGENT"
          : normalized === "SELLER"
          ? "SELLER_AGENT"
          : normalized === "BUYER_AGENT"
          ? "BUYER"
          : normalized === "SELLER_AGENT"
          ? "SELLER"
          : null;
      if (fallbackRole) {
        match = pickBest(fallbackRole);
        if (match) {
          const name = [match.contact.firstName, match.contact.lastName].filter(Boolean).join(" ");
          return { email: match.contact.email, name: name || match.contact.email || "", role: fallbackRole };
        }
      }
    }

    // Fallback by contact category when role not assigned (e.g., escrow/lender stored only as category)
    if (!match) {
      if (normalized === "ESCROW") {
        match = stakeholders.find((s) => s.contact.category === "ESCROW");
      } else if (normalized === "LENDER") {
        match = stakeholders.find((s) => s.contact.category === "LENDER");
      }
    }
    if (match) {
      const name = [match.contact.firstName, match.contact.lastName].filter(Boolean).join(" ");
      return { email: match.contact.email, name: name || match.contact.email || "", role: normalized };
    }
    return null;
  };

  const recipientLabel = (task: Task) => {
    const rec = findRecipientForTask(task);
    if (!rec) return null;
    const roleLabelMap: Record<string, string> = {
      BUYER: "Buyer",
      SELLER: "Seller",
      BUYER_AGENT: "Buyer Agent",
      SELLER_AGENT: "Seller Agent",
      LENDER: "Lender",
      ESCROW: "Escrow",
    };
    return `${rec.name || "Recipient"} (${roleLabelMap[rec.role] || rec.role})`;
  };

  const openDraftForTask = (task: Task) => {
    const rec = findRecipientForTask(task);
    const roleLabel = recipientLabel(task) || undefined;
    const baseTemplate = task.template || task.description || task.notes || "";
    const rendered = renderTemplate(baseTemplate || task.title, { summary: project.summary, myClientRole }, stakeholders);
    const roleTag = extractRoleFromTags(task.tags);
    setDraftModal({
      open: true,
      recipient: rec ? { email: rec.email, name: rec.name, roleLabel } : undefined,
      subject: task.title,
      body: rendered,
      tags: task.tags || "",
      contextRole: roleTag || null,
    });
  };

  useEffect(() => {
    const loadStakeholders = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/stakeholders`, { cache: "no-store", credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setStakeholders(data.stakeholders || []);
        setMyClientRole(data.myClientRole ?? null);
      } catch (_) {
        // ignore
      }
    };
    loadStakeholders();
  }, [projectId, stakeholderRefreshKey]);

  const toggleStatus = async (taskId: string, next: boolean) => {
    await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next ? "completed" : "upcoming" }),
    });
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: next ? "completed" : "upcoming" } : t))
    );
    // After toggle, if all tasks completed -> mark project completed
    if (next) {
      const allDone = tasks.every((t) =>
        t.id === taskId ? true : t.status === "completed"
      );
      if (allDone) {
        await fetch(`/api/projects/${projectId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        });
        setProject((p) => ({ ...p, status: "completed" }));
      }
    }
  };

  const togglePriority = async (taskId: string, next: boolean) => {
    await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority: next }),
    });
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, priority: next } : t)));
  };

  const updateDueDate = async (taskId: string, nextDueDate: string | null) => {
    const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dueDate: nextDueDate }),
    });
    if (!res.ok) {
      let msg = "Unable to update due date";
      try {
        const body = await res.json();
        msg = body.error || msg;
      } catch (_) {
        // ignore
      }
      throw new Error(msg);
    }
    const updated = await res.json().catch(() => ({}));
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, dueDate: updated.dueDate ?? nextDueDate } : t
      )
    );
  };

  const deleteTask = async (taskId: string) => {
    await fetch(`/api/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const deleteProject = async () => {
    const input = typeof window !== "undefined" ? window.prompt('Type "delete" to confirm') : null;
    const normalized = input?.trim().toLowerCase();
    if (normalized !== "delete") return;
    try {
      setIsDeletingProject(true);
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        let msg = "Unable to delete project";
        try {
          const body = await res.json();
          msg = body.error || msg;
        } catch (_) {
          // fallback
        }
        throw new Error(msg);
      }
      // Force navigation away and hard refresh to avoid stale client state
      if (typeof window !== "undefined") {
        window.location.assign("/dashboard");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to delete project";
      if (typeof window !== "undefined") {
        window.alert(msg);
      }
    } finally {
      setIsDeletingProject(false);
    }
  };

  const saveTags = async (taskId: string, tags: string) => {
    await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    });
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, tags } : t)));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pt-24">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 pb-8 lg:flex-row lg:gap-8">
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Project</p>
              <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
              {project.status === "completed" ? (
                <p className="text-xs font-semibold text-green-600 mt-1">Completed</p>
              ) : null}
              <a href="/email-templates" className="text-[11px] font-semibold text-[#1b4c96] hover:underline">
                Manage Templates
              </a>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={deleteProject}
                disabled={isDeletingProject}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {isDeletingProject ? "Deleting…" : "Delete Project"}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">My Client</p>
              <p className="text-sm text-gray-700">Choose which side you represent</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateMyClientRole("BUYER")}
                disabled={updatingClient}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  myClientRole === "BUYER"
                    ? "border-[#0275ff] bg-[#eaf2ff] text-[#1b4c96]"
                    : "border-gray-200 bg-white text-gray-700 hover:border-[#9bc4ff]"
                }`}
              >
                Buyer
              </button>
              <button
                type="button"
                onClick={() => updateMyClientRole("SELLER")}
                disabled={updatingClient}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  myClientRole === "SELLER"
                    ? "border-[#0275ff] bg-[#eaf2ff] text-[#1b4c96]"
                    : "border-gray-200 bg-white text-gray-700 hover:border-[#9bc4ff]"
                }`}
              >
                Seller
              </button>
            </div>
          </div>
          {clientWarning ? (
            <p className="text-xs text-amber-600">{clientWarning}</p>
          ) : null}

          <div className="space-y-2">
            {tasks.map((task) => (
              <ProjectTaskCard
                key={task.id}
                title={task.title}
                dueDate={task.dueDate}
                status={task.status}
                onToggle={(checked) => toggleStatus(task.id, checked)}
                onEditTags={() =>
                  setTagModal({ open: true, taskId: task.id, tags: task.tags || "" })
                }
                onDelete={() => deleteTask(task.id)}
                tags={task.tags || ""}
                onOpen={() => setDetailModal({ open: true, task })}
                notesPreview={task.notes || ""}
                priority={task.priority || false}
                onTogglePriority={() => togglePriority(task.id, !(task.priority || false))}
                onDueDateChange={(next) => updateDueDate(task.id, next)}
                hasEmail={tagsIncludeEmail(task.tags)}
                emailRecipientLabel={recipientLabel(task)}
                emailMissing={tagsIncludeEmail(task.tags) && !recipientLabel(task)}
                onDraftEmail={() => openDraftForTask(task)}
                onAddStakeholder={() => setForceStakeholderModal(true)}
              />
            ))}
            {tasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">
                No tasks yet.
              </div>
            ) : null}
          </div>
        </div>
        <div className="w-full max-w-[420px] shrink-0 space-y-4">
          <ProjectSidebar summary={project.summary || {}} myClientRole={myClientRole} />
          <ProjectStakeholderList
            projectId={project.id}
            myClientRole={myClientRole}
            refreshKey={stakeholderRefreshKey}
            forceOpenModal={forceStakeholderModal}
            onModalSettled={() => setForceStakeholderModal(false)}
            onClientRoleChange={(role) => {
              setMyClientRole(role);
              setClientWarning(null);
            }}
          />
        </div>
      </div>

      <TagEditModal
        open={tagModal.open}
        initialTags={tagModal.tags}
        onClose={() => setTagModal({ open: false, taskId: null, tags: "" })}
        onSave={async (tags) => {
          if (!tagModal.taskId) return;
          await saveTags(tagModal.taskId, tags);
          setTagModal({ open: false, taskId: null, tags: "" });
        }}
      />

      <TaskDetailModal
        open={detailModal.open}
        title={detailModal.task?.title || ""}
        status={detailModal.task?.status || "upcoming"}
        dueDate={detailModal.task?.dueDate || null}
        tags={detailModal.task?.tags || ""}
        notes={detailModal.task?.notes || ""}
        onClose={() => setDetailModal({ open: false, task: null })}
        onSave={async (notes) => {
          const taskId = detailModal.task?.id;
          if (!taskId) return;
          await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notes }),
          });
          setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, notes } : t)));
        }}
      />
      <EmailDraftModal
        open={draftModal.open}
        onClose={() => setDraftModal({ open: false })}
        recipient={draftModal.recipient}
        subject={draftModal.subject}
        body={draftModal.body}
        projectId={projectId}
        tags={draftModal.tags}
        contextRole={draftModal.contextRole}
        stakeholders={stakeholders}
        projectSummary={project.summary || {}}
      />
    </div>
  );
}

