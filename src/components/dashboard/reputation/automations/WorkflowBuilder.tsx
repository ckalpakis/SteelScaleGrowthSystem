"use client";

import { useState } from "react";
import { Button, Input, Label, cn } from "@/components/ui";
import { PageHeader, Panel, BoltIcon, PlusIcon, SendIcon, TemplateIcon } from "@/components/dashboard/reputation/ui";
import {
  WORKFLOW_TRIGGERS,
  WORKFLOW_STOP_CONDITIONS,
  DELAY_UNITS,
  splitDelay,
  formatDelay,
  triggerLabel,
  type ReviewWorkflow,
  type WorkflowTrigger,
  type StopCondition,
} from "@/lib/reputation";
import {
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  toggleWorkflow,
  type WorkflowInput,
} from "@/app/dashboard/reputation/automations/actions";

type TemplateOption = { id: string; name: string };

type Draft = { id: string | null } & WorkflowInput;

function blankDraft(): Draft {
  return {
    id: null,
    name: "",
    trigger_type: "job_completed",
    template_id: null,
    delay_minutes: 4320, // 3 days
    reminder_count: 1,
    reminder_delay_minutes: 2880, // 2 days
    stop_conditions: ["clicked_review_link", "review_received", "replied_stop"],
    is_active: true,
  };
}

function toDraft(w: ReviewWorkflow): Draft {
  return {
    id: w.id,
    name: w.name,
    trigger_type: w.trigger_type,
    template_id: w.template_id,
    delay_minutes: w.delay_minutes,
    reminder_count: w.reminder_count,
    reminder_delay_minutes: w.reminder_delay_minutes,
    stop_conditions: w.stop_conditions ?? [],
    is_active: w.is_active,
  };
}

export function WorkflowBuilder({
  workflows: initial,
  templates,
}: {
  workflows: ReviewWorkflow[];
  templates: TemplateOption[];
}) {
  const [workflows, setWorkflows] = useState<ReviewWorkflow[]>(initial);
  const [draft, setDraft] = useState<Draft>(() => (initial[0] ? toDraft(initial[0]) : blankDraft()));
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNew = draft.id === null;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  function selectWorkflow(w: ReviewWorkflow) {
    setError(null);
    setDraft(toDraft(w));
  }

  function newWorkflow() {
    setError(null);
    setDraft(blankDraft());
  }

  function toggleStop(value: StopCondition) {
    setDraft((d) => ({
      ...d,
      stop_conditions: d.stop_conditions.includes(value)
        ? d.stop_conditions.filter((s) => s !== value)
        : [...d.stop_conditions, value],
    }));
  }

  async function save() {
    setError(null);
    const input: WorkflowInput = { ...draft };
    setSaving(true);
    const res = isNew ? await createWorkflow(input) : await updateWorkflow(draft.id!, input);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setWorkflows((list) => {
      const exists = list.some((w) => w.id === res.workflow.id);
      return exists ? list.map((w) => (w.id === res.workflow.id ? res.workflow : w)) : [res.workflow, ...list];
    });
    setDraft(toDraft(res.workflow));
  }

  async function remove(id: string) {
    setWorkflows((list) => list.filter((w) => w.id !== id));
    if (draft.id === id) {
      const next = workflows.find((w) => w.id !== id);
      setDraft(next ? toDraft(next) : blankDraft());
    }
    setBusy(true);
    try {
      await deleteWorkflow(id);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(w: ReviewWorkflow) {
    const nextActive = !w.is_active;
    setWorkflows((list) => list.map((x) => (x.id === w.id ? { ...x, is_active: nextActive } : x)));
    if (draft.id === w.id) set("is_active", nextActive);
    const res = await toggleWorkflow(w.id, nextActive);
    if (!res.ok) {
      // revert on failure
      setWorkflows((list) => list.map((x) => (x.id === w.id ? { ...x, is_active: w.is_active } : x)));
      if (draft.id === w.id) set("is_active", w.is_active);
      setError(res.error);
    }
  }

  const templateName = templates.find((t) => t.id === draft.template_id)?.name ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Automations"
        description="Build a review workflow: pick a trigger, wait, send, and follow up."
        action={
          <Button onClick={newWorkflow}>
            <PlusIcon className="mr-1.5 h-4 w-4" /> New workflow
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Saved workflows */}
        <aside className="space-y-2">
          {workflows.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#e0e0de] bg-[#fafafa] px-4 py-10 text-center text-sm text-[#787774]">
              No workflows yet. Build your first one.
            </div>
          )}
          {workflows.map((w) => {
            const active = draft.id === w.id;
            return (
              <button
                key={w.id}
                onClick={() => selectWorkflow(w)}
                className={cn(
                  "block w-full rounded-xl border p-4 text-left transition-colors",
                  active ? "border-brand/40 bg-brand/[0.04] ring-1 ring-brand/20" : "border-[#ededec] bg-white hover:bg-[#fafafa]"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <BoltIcon className="h-4 w-4" />
                  </span>
                  <span className="truncate text-sm font-semibold text-[#37352f]">{w.name}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-[#787774]">{triggerLabel(w.trigger_type)}</span>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                      w.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {w.is_active ? "Active" : "Paused"}
                  </span>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Config + diagram */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* Config form */}
          <Panel title={isNew ? "New workflow" : "Edit workflow"}>
            <div className="space-y-5">
              <div>
                <Label htmlFor="wf-name">Workflow name</Label>
                <Input
                  id="wf-name"
                  value={draft.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Post-job review request"
                />
              </div>

              {/* Trigger */}
              <div>
                <Label>Trigger</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {WORKFLOW_TRIGGERS.map((t) => {
                    const on = draft.trigger_type === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => set("trigger_type", t.value as WorkflowTrigger)}
                        className={cn(
                          "rounded-lg border px-3 py-2.5 text-left transition-colors",
                          on ? "border-brand/50 bg-brand/[0.04] ring-1 ring-brand/20" : "border-[#e0e0de] bg-white hover:bg-[#fafafa]"
                        )}
                      >
                        <div className="text-sm font-medium text-[#37352f]">{t.label}</div>
                        <div className="mt-0.5 text-xs text-[#9b9a97]">{t.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Initial delay */}
              <div>
                <Label>Wait before sending</Label>
                <DelayField
                  key={`delay-${draft.id ?? "new"}`}
                  minutes={draft.delay_minutes}
                  onChange={(m) => set("delay_minutes", m)}
                />
              </div>

              {/* Template */}
              <div>
                <Label htmlFor="wf-template">Message template</Label>
                <select
                  id="wf-template"
                  value={draft.template_id ?? ""}
                  onChange={(e) => set("template_id", e.target.value || null)}
                  className="w-full rounded-md border border-[#e0e0de] bg-white px-3 py-2 text-sm text-[#37352f] transition-colors focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15"
                >
                  <option value="">Select a template…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {templates.length === 0 && (
                  <p className="mt-1.5 text-xs text-[#9b9a97]">
                    No SMS templates yet — create one in Templates first.
                  </p>
                )}
              </div>

              {/* Reminders */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="wf-rcount">Reminder count</Label>
                  <select
                    id="wf-rcount"
                    value={draft.reminder_count}
                    onChange={(e) => set("reminder_count", Number(e.target.value))}
                    className="w-full rounded-md border border-[#e0e0de] bg-white px-3 py-2 text-sm text-[#37352f] transition-colors focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15"
                  >
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n === 0 ? "No reminders" : `${n} reminder${n === 1 ? "" : "s"}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Reminder delay</Label>
                  <DelayField
                    key={`rdelay-${draft.id ?? "new"}`}
                    minutes={draft.reminder_delay_minutes}
                    disabled={draft.reminder_count === 0}
                    onChange={(m) => set("reminder_delay_minutes", m)}
                  />
                </div>
              </div>

              {/* Stop conditions */}
              <div>
                <Label>Stop conditions</Label>
                <div className="space-y-2">
                  {WORKFLOW_STOP_CONDITIONS.map((s) => {
                    const on = draft.stop_conditions.includes(s.value);
                    return (
                      <label
                        key={s.value}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                          on ? "border-brand/40 bg-brand/[0.03]" : "border-[#e0e0de] bg-white hover:bg-[#fafafa]"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleStop(s.value)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#c9c9c7] text-brand focus:ring-brand/30"
                        />
                        <span>
                          <span className="block text-sm font-medium text-[#37352f]">{s.label}</span>
                          <span className="block text-xs text-[#9b9a97]">{s.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Active */}
              <label className="flex items-center justify-between gap-3 rounded-lg border border-[#e0e0de] bg-white px-3 py-2.5">
                <span>
                  <span className="block text-sm font-medium text-[#37352f]">Active</span>
                  <span className="block text-xs text-[#9b9a97]">Turn the workflow on or pause it.</span>
                </span>
                <button
                  type="button"
                  onClick={() => set("is_active", !draft.is_active)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                    draft.is_active ? "bg-brand" : "bg-[#e0e0de]"
                  )}
                  aria-pressed={draft.is_active}
                >
                  <span
                    className={cn(
                      "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                      draft.is_active ? "translate-x-5" : "translate-x-0.5"
                    )}
                  />
                </button>
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex flex-wrap items-center gap-2 border-t border-[#f0f0ef] pt-4">
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving…" : isNew ? "Create workflow" : "Save changes"}
                </Button>
                {!isNew && (
                  <Button variant="ghost" className="!text-red-600" disabled={busy} onClick={() => remove(draft.id!)}>
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </Panel>

          {/* Live vertical diagram */}
          <Panel title="Workflow">
            <WorkflowDiagram
              trigger={draft.trigger_type}
              delayMinutes={draft.delay_minutes}
              templateName={templateName}
              reminderCount={draft.reminder_count}
              reminderDelayMinutes={draft.reminder_delay_minutes}
              stopConditions={draft.stop_conditions}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- delay control
function DelayField({
  minutes,
  onChange,
  disabled,
}: {
  minutes: number;
  onChange: (minutes: number) => void;
  disabled?: boolean;
}) {
  const initial = splitDelay(minutes);
  const [value, setValue] = useState<number>(initial.value);
  const [unit, setUnit] = useState<string>(initial.unit);

  function emit(nextValue: number, nextUnit: string) {
    const mult = DELAY_UNITS.find((u) => u.value === nextUnit)?.minutes ?? 1;
    onChange(Math.max(0, Math.floor(nextValue)) * mult);
  }

  return (
    <div className="flex gap-2">
      <Input
        type="number"
        min={0}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const v = Number(e.target.value);
          setValue(v);
          emit(v, unit);
        }}
        className="w-24 disabled:opacity-50"
      />
      <select
        value={unit}
        disabled={disabled}
        onChange={(e) => {
          setUnit(e.target.value);
          emit(value, e.target.value);
        }}
        className="rounded-md border border-[#e0e0de] bg-white px-3 py-2 text-sm text-[#37352f] transition-colors focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15 disabled:opacity-50"
      >
        {DELAY_UNITS.map((u) => (
          <option key={u.value} value={u.value}>
            {u.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ------------------------------------------------------------- vertical diagram
function WorkflowDiagram({
  trigger,
  delayMinutes,
  templateName,
  reminderCount,
  reminderDelayMinutes,
  stopConditions,
}: {
  trigger: WorkflowTrigger;
  delayMinutes: number;
  templateName: string | null;
  reminderCount: number;
  reminderDelayMinutes: number;
  stopConditions: StopCondition[];
}) {
  const stopLabels = WORKFLOW_STOP_CONDITIONS.filter((s) => stopConditions.includes(s.value)).map((s) => s.label);

  return (
    <div className="flex flex-col items-center">
      <Node
        tone="trigger"
        icon={<BoltIcon className="h-4 w-4" />}
        title="Trigger"
        subtitle={triggerLabel(trigger)}
      />
      <Connector label={`Wait ${formatDelay(delayMinutes)}`} />
      <Node
        tone="send"
        icon={<SendIcon className="h-4 w-4" />}
        title="Send SMS"
        subtitle={templateName ?? "No template selected"}
        muted={!templateName}
      />

      {Array.from({ length: reminderCount }).map((_, i) => (
        <div key={i} className="flex w-full flex-col items-center">
          <Connector label={`Wait ${formatDelay(reminderDelayMinutes)}`} />
          <Node
            tone="reminder"
            icon={<TemplateIcon className="h-4 w-4" />}
            title={`Reminder ${i + 1}`}
            subtitle={templateName ?? "No template selected"}
            muted={!templateName}
          />
        </div>
      ))}

      <Connector />
      <Node
        tone="end"
        icon={<CheckIcon className="h-4 w-4" />}
        title="End"
        subtitle={stopLabels.length ? `Stops on: ${stopLabels.join(", ")}` : "Runs to completion"}
      />
    </div>
  );
}

function Node({
  tone,
  icon,
  title,
  subtitle,
  muted,
}: {
  tone: "trigger" | "send" | "reminder" | "end";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  muted?: boolean;
}) {
  const tones: Record<string, string> = {
    trigger: "border-amber-200 bg-amber-50",
    send: "border-brand/30 bg-brand/[0.04]",
    reminder: "border-blue-200 bg-blue-50",
    end: "border-green-200 bg-green-50",
  };
  const iconTones: Record<string, string> = {
    trigger: "bg-amber-100 text-amber-600",
    send: "bg-brand/10 text-brand",
    reminder: "bg-blue-100 text-blue-600",
    end: "bg-green-100 text-green-600",
  };
  return (
    <div className={cn("flex w-full items-start gap-3 rounded-xl border px-3.5 py-3", tones[tone])}>
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", iconTones[tone])}>{icon}</span>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-[#37352f]">{title}</div>
        <div className={cn("mt-0.5 break-words text-xs", muted ? "text-[#b9b9b7]" : "text-[#787774]")}>{subtitle}</div>
      </div>
    </div>
  );
}

function Connector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-1">
      <span className="h-4 w-px bg-[#d9d9d7]" />
      {label ? (
        <span className="my-1 rounded-full bg-[#f4f4f2] px-2.5 py-0.5 text-[11px] font-medium text-[#787774]">{label}</span>
      ) : (
        <ArrowDown className="my-0.5 h-3.5 w-3.5 text-[#c9c9c7]" />
      )}
      <span className="h-4 w-px bg-[#d9d9d7]" />
    </div>
  );
}

function ArrowDown({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M5 12l5 5 9-11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
