import type { SupabaseClient } from "@supabase/supabase-js";
import { sendCompanySms } from "@/lib/reputation.sms";
import { generateShortCode } from "@/lib/reputation.server";
import { renderTemplate, reviewLinkUrl, type StopCondition } from "@/lib/reputation";

// =============================================================================
// Review request engine. A review_requests row is a workflow run for one
// contact; this module enrolls contacts and advances due runs as a scheduled
// background job. Server-only.
//
// Safety properties:
//   - Duplicate sends: each step is sent through sendCompanySms with a unique
//     step_key, backed by a DB unique index — a step can never fire twice.
//   - Concurrency: a run is claimed with a locked_at stamp before processing,
//     so overlapping cron invocations never touch the same run.
//   - Retries: transient send failures back off and retry up to MAX_ATTEMPTS,
//     then the run is marked failed.
//   - Auditability: every transition writes a review_events row.
// =============================================================================

const MAX_ATTEMPTS = 4;
const LOCK_TTL_MS = 5 * 60 * 1000; // a claimed run is reclaimable after 5 min
const BACKOFF_MINUTES = [5, 15, 60]; // per transient attempt
const DEFAULT_BODY =
  "Hi {{customer_name}}, thanks for choosing {{company_name}}! If you were happy with your {{service}}, would you leave us a quick review? {{review_link}}";

interface WorkflowRow {
  id: string;
  company_id: string;
  is_active: boolean;
  template_id: string | null;
  delay_minutes: number;
  reminder_count: number;
  reminder_delay_minutes: number;
  stop_conditions: StopCondition[];
}

interface ContactRow {
  id: string;
  name: string;
  phone: string | null;
  service: string | null;
  status: string;
  sms_consent: boolean;
}

interface RequestRow {
  id: string;
  company_id: string;
  contact_id: string;
  workflow_id: string | null;
  template_id: string | null;
  short_code: string | null;
  review_url: string | null;
  status: string;
  next_action: string;
  reminders_sent: number;
  attempts: number;
  clicked_at: string | null;
}

// ------------------------------------------------------------- enrollment
export interface EnrollResult {
  ok: boolean;
  requestId?: string;
  skipped?: string;
  error?: string;
}

// Enroll a contact into a workflow: create the run and schedule the first send.
// Guards against enrolling a contact who can't be texted or already has an
// active run for this workflow.
export async function enrollContactInWorkflow(
  admin: SupabaseClient,
  workflowId: string,
  contactId: string
): Promise<EnrollResult> {
  const { data: workflow } = await admin
    .from("review_workflows")
    .select("id, company_id, is_active, template_id, delay_minutes, reminder_count, reminder_delay_minutes, stop_conditions")
    .eq("id", workflowId)
    .maybeSingle<WorkflowRow>();
  if (!workflow) return { ok: false, error: "Workflow not found." };
  if (!workflow.is_active) return { ok: false, skipped: "workflow_inactive" };

  const { data: contact } = await admin
    .from("review_contacts")
    .select("id, name, phone, service, status, sms_consent")
    .eq("id", contactId)
    .maybeSingle<ContactRow>();
  if (!contact) return { ok: false, error: "Contact not found." };
  if (!contact.phone) return { ok: false, skipped: "no_phone" };
  if (contact.status === "opted_out" || !contact.sms_consent) return { ok: false, skipped: "no_consent" };

  // Don't double-enroll an active run for the same workflow + contact.
  const { data: active } = await admin
    .from("review_requests")
    .select("id")
    .eq("workflow_id", workflowId)
    .eq("contact_id", contactId)
    .not("status", "in", "(completed,failed,opted_out)")
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (active) return { ok: false, skipped: "already_enrolled", requestId: active.id };

  // Destination review URL: the company's Google URL.
  const { data: settings } = await admin
    .from("review_settings")
    .select("google_review_url")
    .eq("company_id", workflow.company_id)
    .maybeSingle<{ google_review_url: string | null }>();

  const scheduledAt = new Date(Date.now() + workflow.delay_minutes * 60_000).toISOString();

  const { data: created, error } = await admin
    .from("review_requests")
    .insert({
      company_id: workflow.company_id,
      contact_id: contactId,
      workflow_id: workflowId,
      template_id: workflow.template_id,
      channel: "sms",
      status: "scheduled",
      short_code: generateShortCode(),
      review_url: settings?.google_review_url ?? null,
      next_action: "send_initial",
      reminders_sent: 0,
      scheduled_at: scheduledAt,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !created) return { ok: false, error: error?.message ?? "Could not enroll contact." };

  await admin.from("review_requests").update({ status: "scheduled" }).eq("id", created.id);
  await admin.from("review_events").insert([
    { company_id: workflow.company_id, request_id: created.id, contact_id: contactId, event_type: "request_created", data: { workflow_id: workflowId } },
    { company_id: workflow.company_id, request_id: created.id, contact_id: contactId, event_type: "workflow_started", data: { workflow_id: workflowId } },
  ]);

  return { ok: true, requestId: created.id };
}

// Enroll every eligible contact matching a trigger. Used by trigger hooks.
export async function enrollByTrigger(
  admin: SupabaseClient,
  companyId: string,
  triggerType: string,
  contactId: string
): Promise<void> {
  const { data: workflows } = await admin
    .from("review_workflows")
    .select("id")
    .eq("company_id", companyId)
    .eq("trigger_type", triggerType)
    .eq("is_active", true)
    .returns<{ id: string }[]>();

  for (const w of workflows ?? []) {
    await enrollContactInWorkflow(admin, w.id, contactId);
  }
}

// ------------------------------------------------------------- processing
export interface EngineSummary {
  processed: number;
  sent: number;
  completed: number;
  failed: number;
  skipped: number;
}

// Advance all runs that are due. Called by the cron.
export async function processDueRequests(
  admin: SupabaseClient,
  opts: { limit?: number; now?: Date } = {}
): Promise<EngineSummary> {
  const now = opts.now ?? new Date();
  const limit = opts.limit ?? 100;
  const nowIso = now.toISOString();
  const lockCutoff = new Date(now.getTime() - LOCK_TTL_MS).toISOString();

  const summary: EngineSummary = { processed: 0, sent: 0, completed: 0, failed: 0, skipped: 0 };

  const { data: due } = await admin
    .from("review_requests")
    .select("id, company_id, contact_id, workflow_id, template_id, short_code, review_url, status, next_action, reminders_sent, attempts, clicked_at, locked_at")
    .in("next_action", ["send_initial", "send_reminder", "complete"])
    .lte("scheduled_at", nowIso)
    .not("status", "in", "(completed,failed,opted_out)")
    .order("scheduled_at", { ascending: true })
    .limit(limit)
    .returns<(RequestRow & { locked_at: string | null })[]>();

  for (const req of due ?? []) {
    // Claim the run atomically — skip if another worker already holds it.
    const { data: claimed } = await admin
      .from("review_requests")
      .update({ locked_at: nowIso })
      .eq("id", req.id)
      .or(`locked_at.is.null,locked_at.lt.${lockCutoff}`)
      .select("id")
      .maybeSingle<{ id: string }>();
    if (!claimed) {
      summary.skipped++;
      continue;
    }

    summary.processed++;
    try {
      const outcome = await processOne(admin, req, now);
      if (outcome === "sent") summary.sent++;
      else if (outcome === "completed") summary.completed++;
      else if (outcome === "failed") summary.failed++;
      else summary.skipped++;
    } catch (err) {
      console.error("[engine] error processing request", req.id, err);
      await admin.from("review_requests").update({ locked_at: null }).eq("id", req.id);
      summary.failed++;
    }
  }

  return summary;
}

type Outcome = "sent" | "completed" | "failed" | "noop";

async function complete(admin: SupabaseClient, req: RequestRow, reason: string): Promise<Outcome> {
  await admin
    .from("review_requests")
    .update({ status: "completed", next_action: "done", scheduled_at: null, completed_at: new Date().toISOString(), locked_at: null })
    .eq("id", req.id);
  await admin.from("review_events").insert({
    company_id: req.company_id,
    request_id: req.id,
    contact_id: req.contact_id,
    event_type: "workflow_started", // reuse existing enum; detail in data
    data: { phase: "completed", reason },
  });
  return "completed";
}

async function fail(admin: SupabaseClient, req: RequestRow, error: string): Promise<Outcome> {
  await admin
    .from("review_requests")
    .update({ status: "failed", next_action: "done", scheduled_at: null, locked_at: null })
    .eq("id", req.id);
  await admin.from("review_events").insert({
    company_id: req.company_id,
    request_id: req.id,
    contact_id: req.contact_id,
    event_type: "message_failed",
    data: { phase: "workflow_failed", error },
  });
  return "failed";
}

async function processOne(admin: SupabaseClient, req: RequestRow, now: Date): Promise<Outcome> {
  // Workflow must still exist and be active.
  const { data: workflow } = await admin
    .from("review_workflows")
    .select("id, company_id, is_active, template_id, delay_minutes, reminder_count, reminder_delay_minutes, stop_conditions")
    .eq("id", req.workflow_id ?? "")
    .maybeSingle<WorkflowRow>();
  if (!workflow || !workflow.is_active) return complete(admin, req, "workflow_inactive");

  // Contact must exist and still be contactable.
  const { data: contact } = await admin
    .from("review_contacts")
    .select("id, name, phone, service, status, sms_consent")
    .eq("id", req.contact_id)
    .maybeSingle<ContactRow>();
  if (!contact) return fail(admin, req, "contact_missing");
  if (!contact.phone) return fail(admin, req, "no_phone");
  if (contact.status === "opted_out" || !contact.sms_consent) return complete(admin, req, "opted_out");

  // Stop conditions — halt the run early if any configured condition is met.
  const stop = evaluateStop(workflow.stop_conditions ?? [], req, contact);
  if (stop) return complete(admin, req, stop);

  if (req.next_action === "complete") return complete(admin, req, "reminders_exhausted");

  // Build the message from the workflow's template (or a sensible default).
  const body = await buildBody(admin, req, workflow, contact);
  const isInitial = req.next_action === "send_initial";
  const stepKey = isInitial ? "initial" : `reminder_${req.reminders_sent + 1}`;

  const result = await sendCompanySms(admin, req.company_id, {
    to: contact.phone,
    body,
    requestId: req.id,
    contactId: req.contact_id,
    stepKey,
  });

  if (!result.ok) {
    // Transient failure → back off and retry, or give up after MAX_ATTEMPTS.
    const attempts = req.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) return fail(admin, req, result.error ?? "send_failed");
    const backoff = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)];
    await admin
      .from("review_requests")
      .update({ attempts, scheduled_at: new Date(now.getTime() + backoff * 60_000).toISOString(), locked_at: null })
      .eq("id", req.id);
    return "noop";
  }

  // Success (or already-sent): advance the state machine.
  if (isInitial) {
    if (workflow.reminder_count > 0) {
      await admin
        .from("review_requests")
        .update({
          status: "sent",
          sent_at: now.toISOString(),
          attempts: 0,
          next_action: "send_reminder",
          scheduled_at: new Date(now.getTime() + workflow.reminder_delay_minutes * 60_000).toISOString(),
          locked_at: null,
        })
        .eq("id", req.id);
      return "sent";
    }
    // No reminders — the run is done after the first send.
    await admin
      .from("review_requests")
      .update({ status: "sent", sent_at: now.toISOString(), attempts: 0, next_action: "done", scheduled_at: null, completed_at: now.toISOString(), locked_at: null })
      .eq("id", req.id);
    return "sent";
  }

  // Reminder sent.
  const remindersSent = req.reminders_sent + 1;
  const moreToGo = remindersSent < workflow.reminder_count;
  await admin
    .from("review_requests")
    .update({
      reminders_sent: remindersSent,
      attempts: 0,
      next_action: moreToGo ? "send_reminder" : "done",
      scheduled_at: moreToGo ? new Date(now.getTime() + workflow.reminder_delay_minutes * 60_000).toISOString() : null,
      status: moreToGo ? "sent" : "completed",
      completed_at: moreToGo ? null : now.toISOString(),
      locked_at: null,
    })
    .eq("id", req.id);
  return moreToGo ? "sent" : "completed";
}

// Which configured stop condition, if any, currently holds.
function evaluateStop(conditions: StopCondition[], req: RequestRow, contact: ContactRow): string | null {
  for (const c of conditions) {
    if (c === "clicked_review_link" && req.clicked_at) return "clicked_review_link";
    if (c === "review_received" && contact.status === "reviewed") return "review_received";
    if (c === "replied_stop" && (contact.status === "opted_out" || !contact.sms_consent)) return "replied_stop";
  }
  return null;
}

async function buildBody(
  admin: SupabaseClient,
  req: RequestRow,
  workflow: WorkflowRow,
  contact: ContactRow
): Promise<string> {
  let template: string | null = null;
  const templateId = req.template_id ?? workflow.template_id;
  if (templateId) {
    const { data } = await admin.from("review_templates").select("body").eq("id", templateId).maybeSingle<{ body: string }>();
    template = data?.body ?? null;
  }
  const { data: company } = await admin.from("companies").select("name").eq("id", req.company_id).maybeSingle<{ name: string }>();

  const values: Record<string, string> = {
    customer_name: contact.name || "there",
    company_name: company?.name || "us",
    service: contact.service || "service",
    technician: "",
    review_link: req.short_code ? reviewLinkUrl(req.short_code) : req.review_url || "",
    city: "",
  };
  return renderTemplate(template ?? DEFAULT_BODY, values);
}
