"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TemplateCategory } from "@prisma/client";
import { renderTemplate, validatePlaceholders } from "@/lib/emailTemplates";
import { TemplateModal } from "@/components/email-templates/TemplateModal";

type Recipient = {
  email?: string | null;
  name?: string;
  roleLabel?: string;
};

type RecipientOption = Recipient & {
  id: string;
  role?: string;
};

type Stakeholder = {
  role: string;
  contact: { firstName?: string | null; lastName?: string | null; email?: string | null; phone?: string | null; company?: string | null };
};

type Props = {
  open: boolean;
  onClose: () => void;
  recipient?: Recipient | null;
  recipients?: RecipientOption[];
  selectedRecipientId?: string | null;
  subject?: string;
  body?: string;
  projectId: string;
  tags?: string;
  stakeholders?: Stakeholder[];
  projectSummary?: Record<string, string | number | null | undefined> | null;
  contextRole?: string | null;
  templateId?: string | null;
  onRecipientChange?: (recipientId: string) => void;
  onTemplateUsed?: (templateId: string) => void;
  onComposed?: () => void;
  onAddStakeholder?: () => void;
};

type Template = {
  id: string;
  name: string;
  category: TemplateCategory;
  description?: string | null;
  subject: string;
  body: string;
  favorite: boolean;
  tags?: string | null;
  version: number;
  updatedAt: string;
  usageCount?: number;
};

export function EmailDraftModal({
  open,
  onClose,
  recipient,
  recipients = [],
  selectedRecipientId,
  subject,
  body,
  projectId,
  tags,
  stakeholders = [],
  projectSummary = {},
  contextRole,
  templateId,
  onRecipientChange,
  onTemplateUsed,
  onComposed,
  onAddStakeholder,
}: Props) {
  const [subj, setSubj] = useState(subject || "");
  const [msg, setMsg] = useState(body || "");
  const [sending, setSending] = useState(false);
  const [hasEdited, setHasEdited] = useState(false);
  const [recipientId, setRecipientId] = useState(selectedRecipientId || "");
  const [canSend, setCanSend] = useState(false);
  const [sendHint, setSendHint] = useState<string | null>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategory, setTemplateCategory] = useState<string>("ALL");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [unknownPlaceholders, setUnknownPlaceholders] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setSubj(subject || "");
      setMsg(body || "");
      setHasEdited(false);
      prefetchTemplates();
    }
  }, [open, subject, body]);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setCanSend(false);
    setSendHint(null);
    fetch("/api/google/status", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { status?: string; error?: string }) => {
        if (!mounted) return;
        if (data.status === "ok") {
          setCanSend(true);
        } else {
          setCanSend(false);
          setSendHint(
            data.status === "missing_scope"
              ? "Reconnect Google to enable Gmail sending."
              : data.error || "Connect Google to send email directly."
          );
        }
      })
      .catch(() => {
        if (!mounted) return;
        setCanSend(false);
        setSendHint("Connect Google to send email directly.");
      });
    return () => {
      mounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (selectedRecipientId) {
      setRecipientId(selectedRecipientId);
      return;
    }
    if (recipients.length === 1) {
      setRecipientId(recipients[0].id);
      onRecipientChange?.(recipients[0].id);
      return;
    }
    setRecipientId("");
  }, [open, selectedRecipientId, recipients, onRecipientChange]);

  const prefetchTemplates = async () => {
    try {
      const res = await fetch("/api/email-templates", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data?.templates)
        ? data.templates
        : Array.isArray(data)
        ? data
        : [];
      setTemplates(list);
    } catch (_) {
      // ignore
    }
  };

  const filteredTemplates = useMemo(() => {
    if (!Array.isArray(templates)) return [];
    const q = templateSearch.trim().toLowerCase();
    return templates
      .filter((t) => (templateCategory === "ALL" ? true : t.category === templateCategory))
      .filter((t) => {
        if (!q) return true;
        return (
          t.name.toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q) ||
          (t.body || "").toLowerCase().includes(q) ||
          (t.tags || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => Number(b.favorite) - Number(a.favorite));
  }, [templates, templateCategory, templateSearch]);

  const activeRecipient = useMemo(() => {
    if (recipients.length > 0) {
      return recipients.find((r) => r.id === recipientId) || null;
    }
    return recipient || null;
  }, [recipients, recipientId, recipient]);

  const recommendedTemplates = useMemo(() => {
    const role = (contextRole || "").toLowerCase();
    const keywords = `${subject || ""} ${body || ""} ${(tags || "")}`.toLowerCase();
    return filteredTemplates.filter((t) => {
      const roleMatch =
        (role.includes("buyer") && (t.category === "BUYER" || t.category === "GENERAL")) ||
        (role.includes("seller") && (t.category === "SELLER" || t.category === "GENERAL")) ||
        (role.includes("agent") && (t.category === "AGENT" || t.category === "GENERAL")) ||
        (role.includes("lender") && (t.category === "LENDER" || t.category === "GENERAL")) ||
        (role.includes("escrow") && (t.category === "ESCROW" || t.category === "GENERAL")) ||
        (!role && t.category === "GENERAL");
      const kwMatch =
        keywords.includes("contract") && (t.tags || "").toLowerCase().includes("contract")
          ? true
          : keywords.includes("closing") && (t.tags || "").toLowerCase().includes("closing")
          ? true
          : keywords.includes("offer") && (t.tags || "").toLowerCase().includes("offer")
          ? true
          : !keywords
          ? true
          : false;
      return roleMatch || kwMatch;
    });
  }, [filteredTemplates, contextRole, subject, body, tags]);

  const handleUseTemplate = useCallback(
    (tmpl: Template, force = false) => {
      const hasEdits = (subj || "").trim().length || (msg || "").trim().length;
      if (hasEdits && !force) {
        const confirmed = confirm("Replace current draft with selected template?");
        if (!confirmed) return;
      }
      const renderedSubject = renderTemplate(tmpl.subject, { summary: projectSummary, myClientRole: null }, stakeholders);
      const renderedBody = renderTemplate(tmpl.body, { summary: projectSummary, myClientRole: null }, stakeholders);
      setSubj(renderedSubject);
      setMsg(renderedBody);
      setSelectedTemplate(tmpl);
      setHasEdited(false);
      onTemplateUsed?.(tmpl.id);
    },
    [msg, onTemplateUsed, projectSummary, stakeholders, subj]
  );

  useEffect(() => {
    if (!open) return;
    const role = (contextRole || "").toLowerCase();
    if (role.includes("buyer")) setTemplateCategory("BUYER");
    else if (role.includes("seller")) setTemplateCategory("SELLER");
    else if (role.includes("agent")) setTemplateCategory("AGENT");
    else if (role.includes("lender")) setTemplateCategory("LENDER");
    else if (role.includes("escrow") || role.includes("title")) setTemplateCategory("ESCROW");
    else setTemplateCategory("ALL");
  }, [open, contextRole]);

  useEffect(() => {
    if (!open || selectedTemplate || hasEdited || templates.length === 0) return;
    const preferred =
      (templateId ? templates.find((t) => t.id === templateId) : null) ||
      recommendedTemplates[0] ||
      filteredTemplates[0] ||
      null;
    if (preferred) {
      handleUseTemplate(preferred, true);
    }
  }, [open, selectedTemplate, hasEdited, templates, templateId, recommendedTemplates, filteredTemplates, handleUseTemplate]);

  const renderedPreview = useMemo(() => {
    if (!selectedTemplate) return { subject: "", body: "" };
    const previewSubject = renderTemplate(
      selectedTemplate.subject,
      { summary: projectSummary, myClientRole: null },
      stakeholders
    );
    const previewBody = renderTemplate(
      selectedTemplate.body,
      { summary: projectSummary, myClientRole: null },
      stakeholders
    );
    return { subject: previewSubject, body: previewBody };
  }, [selectedTemplate, projectSummary, stakeholders]);

  const handleSend = async () => {
    if (!activeRecipient?.email) {
      alert("Missing recipient email");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          to: [activeRecipient.email],
          subject: subj || "TC Simple Update",
          body: msg,
          projectId,
          tags,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unable to send email");
      onComposed?.();
      onClose();
    } catch (e: unknown) {
      const error = e as { message?: string };
      alert(error.message || "Unable to send email");
    } finally {
      setSending(false);
    }
  };

  

  useEffect(() => {
    const validation = validatePlaceholders(`${subj}\n${msg}`);
    setUnknownPlaceholders(validation.unknown);
  }, [subj, msg]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl max-h-[85vh] overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-40 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 shadow-lg hover:bg-red-100 hover:border-red-300"
          aria-label="Close"
        >
          ✕
        </button>
        <div className="flex h-full gap-4 overflow-hidden">
          {/* Left side — Email draft form */}
          <div className="flex flex-col flex-1 overflow-y-auto pr-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Email</p>
                <h3 className="text-lg font-semibold text-slate-900">Draft email</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/email-templates"
                  className="text-xs font-semibold text-[#1b4c96] hover:underline"
                >
                  Manage Templates
                </a>
                <button
                  type="button"
                  onClick={() => setDrawerOpen((p) => !p)}
                  className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Templates
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">To</label>
                {recipients.length > 1 ? (
                  <select
                    value={recipientId}
                    onChange={(e) => {
                      setRecipientId(e.target.value);
                      onRecipientChange?.(e.target.value);
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
                  >
                    <option value="">Select recipient</option>
                    {recipients.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name || r.email || "Recipient"} {r.roleLabel ? `(${r.roleLabel})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="mt-1 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                    <span>
                      {activeRecipient?.email || recipient?.email || "Missing recipient"}{" "}
                      {activeRecipient?.roleLabel || recipient?.roleLabel ? (
                        <span className="text-slate-500">
                          ({activeRecipient?.roleLabel || recipient?.roleLabel})
                        </span>
                      ) : null}
                    </span>
                  </div>
                )}
                {(recipients.length === 0 || (activeRecipient && !activeRecipient.email)) && (
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <span>No email on file for this role. Add stakeholder email to send.</span>
                    {onAddStakeholder ? (
                      <button
                        type="button"
                        onClick={onAddStakeholder}
                        className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-semibold text-amber-800"
                      >
                        Add stakeholder
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Template</label>
                <div className="mt-1 flex items-center gap-2">
                  <select
                    value={selectedTemplate?.id || ""}
                    onChange={(e) => {
                      const tmpl = templates.find((t) => t.id === e.target.value);
                      if (tmpl) handleUseTemplate(tmpl);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
                  >
                    <option value="">Select a template</option>
                    {recommendedTemplates.slice(0, 5).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen((p) => !p)}
                    className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Browse
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Templates are filtered by recipient role and task keywords.
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Subject</label>
                <input
                  value={subj}
                  onChange={(e) => {
                    setSubj(e.target.value);
                    setHasEdited(true);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
                  placeholder="Subject"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Body</label>
                <textarea
                  value={msg}
                  onChange={(e) => {
                    setMsg(e.target.value);
                    setHasEdited(true);
                  }}
                  rows={10}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#9bc4ff] focus:outline-none focus:ring-2 focus:ring-[#9bc4ff33]"
                  placeholder="Write your message..."
                />
                {unknownPlaceholders.length ? (
                  <p className="mt-1 text-xs text-amber-700">
                    Unknown placeholders: {unknownPlaceholders.join(", ")}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  className="rounded-md border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Save as Template
                </button>
                <a href="/email-templates" className="text-[#1b4c96] hover:underline">
                  Manage Templates
                </a>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(
                    `To: ${activeRecipient?.email || ""}\nSubject: ${subj}\n\n${msg}`
                  );
                  onComposed?.();
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Copy Email
              </button>
              <a
                href={`mailto:${encodeURIComponent(activeRecipient?.email || "")}?subject=${encodeURIComponent(
                  subj
                )}&body=${encodeURIComponent(msg)}`}
                onClick={() => onComposed?.()}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Open in Email
              </a>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                disabled={sending}
              >
                Cancel
              </button>
              {canSend ? (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending}
                  className="rounded-lg bg-[#0275ff] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0169e6] disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Send via Gmail"}
                </button>
              ) : (
                <span className="text-[11px] text-slate-500 self-center">{sendHint}</span>
              )}
            </div>
          </div>

          {/* Right side — Templates drawer */}
          {drawerOpen ? (
            <div className="flex flex-col w-[360px] shrink-0 border-l border-gray-200 overflow-hidden">
              <div className="sticky top-0 z-20 bg-white py-3 px-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800">Templates</h3>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    placeholder="Search"
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs shadow-sm focus:border-[#9bc4ff] focus:outline-none"
                  />
                  <select
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs shadow-sm focus:border-[#9bc4ff] focus:outline-none"
                  >
                    <option value="ALL">All</option>
                    {Object.keys(TemplateCategory).map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0) + c.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {templates.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-white p-3 text-sm text-slate-500">
                    No templates yet. Create one here →{" "}
                    <button
                      type="button"
                      className="text-[#1b4c96] underline"
                      onClick={() => setShowTemplateModal(true)}
                    >
                      Create Template
                    </button>
                  </div>
                ) : null}

                {recommendedTemplates.length ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Recommended</p>
                    <div className="space-y-2">
                      {recommendedTemplates.slice(0, 3).map((t) => (
                        <TemplateCard
                          key={t.id}
                          tmpl={t}
                          expanded={selectedTemplate?.id === t.id}
                          onSelect={(tmpl) => setSelectedTemplate(tmpl)}
                          onUse={handleUseTemplate}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  {filteredTemplates.map((t) => (
                    <TemplateCard
                      key={t.id}
                      tmpl={t}
                      expanded={selectedTemplate?.id === t.id}
                      onSelect={(tmpl) => setSelectedTemplate(tmpl)}
                      onUse={handleUseTemplate}
                    />
                  ))}
                </div>
              </div>

              {selectedTemplate ? (
                <div className="max-h-[40vh] overflow-y-auto border-t border-gray-200 bg-gray-50/60 p-4 rounded-t-xl shadow-inner">
                  <h4 className="font-semibold text-gray-900 mb-3">Preview</h4>

                  <div className="rounded-xl bg-white shadow p-4 leading-relaxed text-gray-700 whitespace-pre-wrap break-words">
                    <p className="text-sm text-gray-500 font-medium mb-2">Subject</p>
                    <p className="mb-4">{renderedPreview.subject}</p>

                    <p className="text-sm text-gray-500 font-medium mb-2">Body</p>
                    <p>{renderedPreview.body}</p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <TemplateModal
        open={showTemplateModal}
        initial={{ subject: subj, body: msg }}
        onClose={() => setShowTemplateModal(false)}
        onSaved={async () => {
          await prefetchTemplates();
          setDrawerOpen(true);
        }}
      />
    </div>
  );
}

function TemplateCard({
  tmpl,
  onSelect,
  onUse,
  expanded,
  containerClass,
}: {
  tmpl: Template;
  onSelect: (t: Template) => void;
  onUse: (t: Template) => void;
  expanded?: boolean;
  containerClass?: string;
}) {
  return (
    <div
      className={`rounded-2xl border ${
        expanded ? "border-[#9bc4ff]" : "border-slate-200"
      } bg-white p-3 shadow-sm transition-all duration-200 ease-out hover:border-[#9bc4ff] cursor-pointer ${
        expanded ? "animate-fadeIn" : ""
      } ${containerClass || ""}`}
      onClick={() => onSelect(tmpl)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">{tmpl.name}</p>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600">
            <span className="rounded-full bg-slate-100 px-2 py-0.5">{tmpl.category.toLowerCase()}</span>
            {tmpl.tags
              ? tmpl.tags.split(",").map((t) => (
                  <span key={t} className="rounded-full bg-[#eaf2ff] px-2 py-0.5 text-[#1b4c96]">
                    {t.trim()}
                  </span>
                ))
              : null}
          </div>
          <p className="text-[11px] text-slate-500">Updated {new Date(tmpl.updatedAt).toLocaleDateString()}</p>
          <p className="line-clamp-2 text-[12px] text-slate-600 mt-1 whitespace-pre-wrap">{tmpl.body}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              tmpl.favorite ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            {tmpl.favorite ? "★ Favorite" : "Template"}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUse(tmpl);
            }}
            className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Use
          </button>
        </div>
      </div>
    </div>
  );
}

