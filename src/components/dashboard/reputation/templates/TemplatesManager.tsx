"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { PageHeader, Panel, TemplateIcon, PlusIcon } from "@/components/dashboard/reputation/ui";
import { useToast } from "@/components/dashboard/reputation/Toast";
import { ConfirmDialog, useConfirm } from "@/components/dashboard/reputation/ConfirmDialog";
import { Tooltip } from "@/components/dashboard/reputation/Tooltip";
import {
  MERGE_TAGS,
  MERGE_SAMPLE,
  renderTemplate,
  smsSegments,
  type ReviewTemplate,
} from "@/lib/reputation";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  type TemplateInput,
} from "@/app/dashboard/reputation/templates/actions";

type Draft = { id: string | null; name: string; body: string };

const STARTER =
  "Hi {{customer_name}}, thanks for choosing {{company_name}}! If you were happy with your {{service}}, would you leave us a quick review? {{review_link}}";

export function TemplatesManager({ templates: initial }: { templates: ReviewTemplate[] }) {
  const [templates, setTemplates] = useState<ReviewTemplate[]>(initial);
  const [draft, setDraft] = useState<Draft>(() =>
    initial[0] ? { id: initial[0].id, name: initial[0].name, body: initial[0].body } : { id: null, name: "", body: "" }
  );
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const confirmDelete = useConfirm<string>();

  const isNew = draft.id === null;
  const preview = useMemo(() => renderTemplate(draft.body, MERGE_SAMPLE), [draft.body]);
  const charCount = preview.length;
  const segments = smsSegments(charCount);

  function selectTemplate(t: ReviewTemplate) {
    setDraft({ id: t.id, name: t.name, body: t.body });
  }

  function newTemplate() {
    setDraft({ id: null, name: "", body: STARTER });
    requestAnimationFrame(() => bodyRef.current?.focus());
  }

  function insertTag(tag: string) {
    const token = `{{${tag}}}`;
    const el = bodyRef.current;
    if (!el) {
      setDraft((d) => ({ ...d, body: d.body + token }));
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = draft.body.slice(0, start) + token + draft.body.slice(end);
    setDraft((d) => ({ ...d, body: next }));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function save() {
    const input: TemplateInput = { name: draft.name, body: draft.body };
    setSaving(true);
    const res = isNew ? await createTemplate(input) : await updateTemplate(draft.id!, input);
    setSaving(false);
    if (!res.ok) {
      toast({ title: "Couldn't save template", description: res.error, variant: "error" });
      return;
    }
    setTemplates((list) => {
      const exists = list.some((t) => t.id === res.template.id);
      return exists ? list.map((t) => (t.id === res.template.id ? res.template : t)) : [res.template, ...list];
    });
    setDraft({ id: res.template.id, name: res.template.name, body: res.template.body });
    toast({ title: isNew ? "Template created" : "Template saved", variant: "success" });
  }

  async function remove(id: string) {
    setTemplates((list) => list.filter((t) => t.id !== id)); // instant
    if (draft.id === id) {
      const next = templates.find((t) => t.id !== id);
      next ? setDraft({ id: next.id, name: next.name, body: next.body }) : setDraft({ id: null, name: "", body: "" });
    }
    setBusy(true);
    try {
      await deleteTemplate(id);
      toast({ title: "Template deleted", variant: "success" });
    } finally {
      setBusy(false);
    }
  }

  async function duplicate(id: string) {
    setBusy(true);
    const res = await duplicateTemplate(id);
    setBusy(false);
    if (!res.ok) {
      toast({ title: "Couldn't duplicate", description: res.error, variant: "error" });
      return;
    }
    setTemplates((list) => [res.template, ...list]);
    setDraft({ id: res.template.id, name: res.template.name, body: res.template.body });
    toast({ title: "Template duplicated", variant: "success" });
  }

  // Cmd/Ctrl+S saves the current template.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving) save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, saving]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="SMS Templates"
        description="Create reusable text messages with merge tags."
        action={
          <Button onClick={newTemplate}>
            <PlusIcon className="mr-1.5 h-4 w-4" /> New template
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Template list */}
        <aside className="space-y-2">
          {templates.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#e0e0de] bg-[#fafafa] px-4 py-10 text-center text-sm text-[#787774]">
              No templates yet. Create your first one.
            </div>
          )}
          {templates.map((t) => {
            const active = draft.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => selectTemplate(t)}
                className={
                  "block w-full rounded-xl border p-4 text-left transition-colors " +
                  (active
                    ? "border-brand/40 bg-brand/[0.04] ring-1 ring-brand/20"
                    : "border-[#ededec] bg-white hover:bg-[#fafafa]")
                }
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <TemplateIcon className="h-4 w-4" />
                  </span>
                  <span className="truncate text-sm font-semibold text-[#37352f]">{t.name}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#787774]">{t.body}</p>
              </button>
            );
          })}
        </aside>

        {/* Editor + live preview */}
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Editor */}
          <Panel title={isNew ? "New template" : "Edit template"}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="t-name">Template name</Label>
                <Input
                  id="t-name"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Post-job review request"
                />
              </div>

              <div>
                <Label>Insert a merge tag</Label>
                <div className="flex flex-wrap gap-1.5">
                  {MERGE_TAGS.map((m) => (
                    <button
                      key={m.tag}
                      type="button"
                      onClick={() => insertTag(m.tag)}
                      title={`Inserts {{${m.tag}}}`}
                      className="rounded-md border border-[#e0e0de] bg-white px-2 py-1 text-xs font-medium text-[#5f5e5b] transition-colors hover:border-brand/40 hover:bg-brand/[0.04] hover:text-brand"
                    >
                      {"{{"}
                      {m.tag}
                      {"}}"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="t-body">Message</Label>
                <textarea
                  id="t-body"
                  ref={bodyRef}
                  value={draft.body}
                  onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                  rows={6}
                  placeholder="Hi {{customer_name}}, thanks for choosing {{company_name}}…"
                  className="w-full rounded-md border border-[#e0e0de] bg-white px-3 py-2 text-sm text-[#37352f] placeholder-[#b9b9b7] transition-colors focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15"
                />
                <p className="mt-1.5 text-xs text-[#9b9a97]">
                  {charCount} characters · {segments} SMS segment{segments === 1 ? "" : "s"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-[#f0f0ef] pt-4">
                <Tooltip label="Save (⌘S)">
                  <Button onClick={save} disabled={saving}>
                    {saving ? "Saving…" : isNew ? "Create template" : "Save changes"}
                  </Button>
                </Tooltip>
                {!isNew && (
                  <>
                    <Button variant="secondary" disabled={busy} onClick={() => duplicate(draft.id!)}>
                      Duplicate
                    </Button>
                    <Button variant="ghost" className="!text-red-600" disabled={busy} onClick={() => confirmDelete.ask(draft.id!)}>
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Panel>

          {/* Live preview */}
          <Panel title="Live preview">
            <div className="rounded-2xl bg-[#f2f3f5] p-5">
              <p className="mb-3 text-center text-xs font-medium text-[#9b9a97]">
                {MERGE_SAMPLE.company_name} · now
              </p>
              <div className="mr-8 whitespace-pre-wrap break-words rounded-2xl rounded-tl-md border border-[#e6e6e4] bg-white px-4 py-3 text-sm leading-relaxed text-[#37352f] shadow-sm">
                {preview || <span className="text-[#b9b9b7]">Your message preview will appear here as you type…</span>}
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-[#fafafa] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#9b9a97]">Sample values</p>
              <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                {MERGE_TAGS.map((m) => (
                  <div key={m.tag} className="flex items-center justify-between gap-2">
                    <dt className="truncate font-medium text-[#787774]">{`{{${m.tag}}}`}</dt>
                    <dd className="truncate text-[#37352f]">{m.sample}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete.open}
        onClose={confirmDelete.close}
        onConfirm={() => {
          if (confirmDelete.target) remove(confirmDelete.target);
        }}
        title="Delete template?"
        description="This template will be removed. Workflows using it will fall back to the default message."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
