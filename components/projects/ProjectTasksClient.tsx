"use client";

import { useEffect, useState, useCallback } from "react";
import { ProjectTaskCard } from "./ProjectTaskCard";
import { ProjectStakeholderList, Stakeholder } from "./ProjectStakeholderList";
import { EmailDraftModal } from "./EmailDraftModal";
import { TagEditModal } from "./TagEditModal";
import { TaskDetailModal } from "./TaskDetailModal";
import { extractRoleFromTags, tagsIncludeEmail, renderTemplate, normalizeRoleToStakeholder } from "@/lib/emailHelpers";
import { extractEmailRolesFromTags, emailRoleLabel, emailRoleToStakeholder } from "@/lib/emailTagging";

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
  emailRecipientRole?: string | null;
  emailRecipientEmail?: string | null;
  emailTemplateId?: string | null;
  emailLastComposedAt?: string | null;
};

type Project = {
  id: string;
  name: string;
  summary: Record<string, string | number | null | undefined> | null;
  myClientRole?: "BUYER" | "SELLER" | null;
  status?: string;
};

type Props = {
  projectId: string;
  initialProject: Project;
  initialTasks: Task[];
};

export function ProjectTasksClient({ projectId, initialProject, initialTasks }: Props) {
  const [project] = useState<Project>(initialProject);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [detailModal, setDetailModal] = useState<{ open: boolean; task: Task | null }>({
    open: false,
    task: null,
  });
  const [tagModal, setTagModal] = useState<{ open: boolean; task: Task | null }>({
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
    recipients?: Array<{
      id: string;
      email?: string | null;
      name?: string;
      role: string;
      roleLabel?: string;
    }>;
    selectedRecipientId?: string | null;
    subject?: string;
    body?: string;
    tags?: string;
    contextRole?: string | null;
    templateId?: string | null;
    taskId?: string | null;
  }>({ open: false });

  const updateMyClientRole = async (role: "BUYER" | "SELLER") => {
    setUpdatingClient(true);
    setClientWarning(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/my-client`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to update client");
      
      setMyClientRole(data.myClientRole ?? role);
      if (!data.hasStakeholder) {
        setClientWarning(`No ${role === "BUYER" ? "buyer" : "seller"} stakeholder added yet.`);
      }
      setStakeholderRefreshKey((k) => k + 1);
    } catch (err) {
      setClientWarning(err instanceof Error ? err.message : "Error");
    } finally {
      setUpdatingClient(false);
    }
  };

  const findEmailCandidates = (task: Task) => {
    const emailRoles = extractEmailRolesFromTags(task.tags);
    if (emailRoles.length === 0 && !tagsIncludeEmail(task.tags)) return [];

    const roles = emailRoles.length
      ? emailRoles
      : (() => {
          const roleTag = extractRoleFromTags(task.tags);
          return roleTag ? [roleTag as any] : [];
        })();

    const candidates: Array<{
      id: string;
      email?: string | null;
      name?: string;
      role: string;
      roleLabel?: string;
    }> = [];

    const addCandidate = (roleKey: string, stakeholder: Stakeholder) => {
      const name = [stakeholder.contact.firstName, stakeholder.contact.lastName].filter(Boolean).join(" ");
      const label = emailRoles.length ? emailRoleLabel(roleKey as any) : roleKey;
      candidates.push({
        id: `${roleKey}:${stakeholder.contact.id}`,
        email: stakeholder.contact.email,
        name: name || stakeholder.contact.email || "",
        role: roleKey,
        roleLabel: label,
      });
    };

    roles.forEach((roleKey) => {
      const normalized = normalizeRoleToStakeholder(roleKey?.toUpperCase()) || normalizeRoleToStakeholder(roleKey || "");
      const targetRole = emailRoles.length ? emailRoleToStakeholder(roleKey as any) : normalized;
      if (!targetRole) return;

      const sameRole = stakeholders.filter((s) => s.role === targetRole);
      if (sameRole.length === 0) return;

      if (targetRole === "BUYER" || targetRole === "SELLER") {
        const ordered = [
          ...sameRole.filter((c) => c.contact.category === "CLIENT"),
          ...sameRole.filter((c) => c.contact.category !== "CLIENT"),
        ];
        ordered.forEach((c) => addCandidate(roleKey, c));
        return;
      }

      if (targetRole === "BUYER_AGENT" || targetRole === "SELLER_AGENT") {
        const ordered = [
          ...sameRole.filter((c) => c.contact.category === "AGENT"),
          ...sameRole.filter((c) => c.contact.category !== "AGENT"),
        ];
        ordered.forEach((c) => addCandidate(roleKey, c));
        return;
      }

      sameRole.forEach((c) => addCandidate(roleKey, c));
    });

    return candidates;
  };

  const resolveRecipient = (task: Task) => {
    const candidates = findEmailCandidates(task);
    if (!candidates.length) return { candidates, recipient: null, selectedId: null };

    if (task.emailRecipientEmail) {
      const match = candidates.find((c) => c.email === task.emailRecipientEmail) || null;
      return { candidates, recipient: match, selectedId: match?.id || null };
    }

    if (candidates.length === 1) {
      return { candidates, recipient: candidates[0], selectedId: candidates[0].id };
    }

    return { candidates, recipient: null, selectedId: null };
  };

  const openDraftForTask = (task: Task) => {
    const { candidates, recipient, selectedId } = resolveRecipient(task);
    const rendered = renderTemplate(task.template || task.title, { summary: project.summary, myClientRole }, stakeholders);
    setDraftModal({
      open: true,
      recipient: recipient ? { email: recipient.email, name: recipient.name, roleLabel: recipient.roleLabel } : undefined,
      recipients: candidates,
      selectedRecipientId: selectedId,
      subject: task.title,
      body: rendered,
      tags: task.tags || "",
      contextRole: extractRoleFromTags(task.tags) || null,
      templateId: task.emailTemplateId ?? null,
      taskId: task.id,
    });
  };

  const loadStakeholders = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/stakeholders`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setStakeholders(data.stakeholders || []);
      setMyClientRole(data.myClientRole ?? null);
    } catch (_) { /* ignore */ }
  }, [projectId]);

  useEffect(() => {
    loadStakeholders();
  }, [loadStakeholders, stakeholderRefreshKey]);

  const patchLocalTask = useCallback((taskId: string, patch: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
  }, []);

  const updateTask = useCallback(
    async (taskId: string, payload: Record<string, unknown>) => {
      const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Unable to update task.");
      }
      return body;
    },
    [projectId]
  );

  const toggleStatus = async (taskId: string, next: boolean) => {
    const previous = tasks.find((t) => t.id === taskId)?.status || "upcoming";
    patchLocalTask(taskId, { status: next ? "completed" : "upcoming" });
    try {
      await updateTask(taskId, { status: next ? "completed" : "upcoming" });
    } catch (e) {
      patchLocalTask(taskId, { status: previous });
      console.error(e);
    }
  };

  const togglePriority = async (taskId: string, next: boolean) => {
    const previous = tasks.find((t) => t.id === taskId)?.priority ?? false;
    patchLocalTask(taskId, { priority: next });
    try {
      await updateTask(taskId, { priority: next });
    } catch (e) {
      patchLocalTask(taskId, { priority: previous });
      console.error(e);
    }
  };

  const updateDueDate = async (taskId: string, nextDueDate: string | null) => {
    const previous = tasks.find((t) => t.id === taskId)?.dueDate ?? null;
    const nextIso = nextDueDate ? new Date(nextDueDate).toISOString() : null;
    patchLocalTask(taskId, { dueDate: nextIso });
    try {
      await updateTask(taskId, { dueDate: nextDueDate });
    } catch (e) {
      patchLocalTask(taskId, { dueDate: previous });
      throw e;
    }
  };

  const updateTags = async (taskId: string, nextTags: string) => {
    const previous = tasks.find((t) => t.id === taskId)?.tags ?? null;
    const normalized = nextTags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && t.toLowerCase() !== "ai")
      .join(", ");
    patchLocalTask(taskId, { tags: normalized || null });
    try {
      await updateTask(taskId, { tags: normalized || null });
    } catch (e) {
      patchLocalTask(taskId, { tags: previous });
      throw e;
    }
  };

  const deleteTask = async (taskId: string) => {
    const previous = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Unable to delete task.");
      }
    } catch (e) {
      setTasks(previous);
      console.error(e);
    }
  };

  const deleteProject = async () => {
    if (!window.confirm("Are you sure?")) return;
    setIsDeletingProject(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (res.ok) window.location.assign("/dashboard");
    } finally {
      setIsDeletingProject(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pt-24">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 pb-8 lg:flex-row lg:gap-8">
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
            <div className="flex gap-2">
              <button type="button" onClick={deleteProject} disabled={isDeletingProject} className="text-red-600 text-sm font-medium">Delete Project</button>
            </div>
          </div>
          <div className="space-y-2">
            {tasks.map((task) => {
              const emailEnabled = tagsIncludeEmail(task.tags) || extractEmailRolesFromTags(task.tags).length > 0;
              const { recipient, candidates } = resolveRecipient(task);
              const label = recipient
                ? `${recipient.name || "Recipient"} (${recipient.roleLabel || recipient.role})`
                : candidates.length > 1
                ? "Select recipient"
                : null;
              const emailMissing = emailEnabled && (candidates.length === 0 || (recipient && !recipient.email));
              return (
              <ProjectTaskCard
                key={task.id}
                {...task}
                tags={task.tags ?? undefined}
                onToggle={(checked) => toggleStatus(task.id, checked)}
                onDelete={() => deleteTask(task.id)}
                onEditTags={() => setTagModal({ open: true, task })}
                onOpen={() => setDetailModal({ open: true, task })}
                onDraftEmail={() => openDraftForTask(task)}
                onAddStakeholder={() => setForceStakeholderModal(true)}
                emailRecipientLabel={label}
                hasEmail={emailEnabled}
                onTogglePriority={() => togglePriority(task.id, !(task.priority ?? false))}
                onDueDateChange={(next) => updateDueDate(task.id, next)}
                emailMissing={emailMissing}
                notesPreview={task.notes ?? undefined}
              />
            )})}
          </div>
        </div>
        <div className="w-full max-w-[420px] shrink-0">
          {(updatingClient || clientWarning) && (
            <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">
              {updatingClient ? (
                <p className="text-slate-600">Updating client role…</p>
              ) : (
                <p className="text-amber-700">{clientWarning}</p>
              )}
            </div>
          )}
          <ProjectStakeholderList
            projectId={projectId}
            myClientRole={myClientRole}
            refreshKey={stakeholderRefreshKey}
            forceOpenModal={forceStakeholderModal}
            onModalSettled={() => setForceStakeholderModal(false)}
            onClientRoleChange={(role) => updateMyClientRole(role)}
          />
        </div>
      </div>

      <EmailDraftModal
        {...draftModal}
        onClose={() => setDraftModal({ open: false })}
        projectId={projectId}
        stakeholders={stakeholders}
        projectSummary={project.summary || {}}
        onRecipientChange={async (recipientId) => {
          if (!draftModal.taskId || !draftModal.recipients) return;
          const match = draftModal.recipients.find((r) => r.id === recipientId) || null;
          patchLocalTask(draftModal.taskId, {
            emailRecipientEmail: match?.email ?? null,
            emailRecipientRole: match?.role ?? null,
          });
          try {
            await updateTask(draftModal.taskId, {
              emailRecipientEmail: match?.email ?? null,
              emailRecipientRole: match?.role ?? null,
            });
          } catch (e) {
            console.error(e);
          }
        }}
        onTemplateUsed={async (templateId) => {
          if (!draftModal.taskId) return;
          patchLocalTask(draftModal.taskId, { emailTemplateId: templateId });
          try {
            await updateTask(draftModal.taskId, { emailTemplateId: templateId });
          } catch (e) {
            console.error(e);
          }
        }}
        onComposed={async () => {
          if (!draftModal.taskId) return;
          const ts = new Date().toISOString();
          patchLocalTask(draftModal.taskId, { emailLastComposedAt: ts });
          try {
            await updateTask(draftModal.taskId, { emailLastComposedAt: ts });
          } catch (e) {
            console.error(e);
          }
        }}
        onAddStakeholder={() => setForceStakeholderModal(true)}
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
          patchLocalTask(taskId, { notes });
          try {
            await updateTask(taskId, { notes });
          } catch (e) {
            console.error(e);
          } finally {
            setDetailModal({ open: false, task: null });
          }
        }}
      />

      <TagEditModal
        open={tagModal.open}
        initialTags={tagModal.task?.tags || ""}
        onClose={() => setTagModal({ open: false, task: null })}
        onSave={async (nextTags) => {
          const taskId = tagModal.task?.id;
          if (!taskId) return;
          try {
            await updateTags(taskId, nextTags);
            setTagModal({ open: false, task: null });
          } catch (e) {
            console.error(e);
          }
        }}
      />
    </div>
  );
}