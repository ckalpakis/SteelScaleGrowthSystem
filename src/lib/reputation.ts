// =============================================================================
// Reputation module — shared types and constants. No server-only imports here,
// so this is safe to import from client components too.
// =============================================================================

export type ContactStatus = "new" | "requested" | "reviewed" | "opted_out";

export interface ReviewContact {
  id: string;
  company_id: string;
  lead_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  service: string | null;
  completed_job_date: string | null;
  tags: string[] | null;
  source: string;
  status: ContactStatus;
  sms_consent: boolean;
  last_requested_at: string | null;
  created_at: string;
  updated_at: string;
}

export const CONTACT_STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "requested", label: "Requested" },
  { value: "reviewed", label: "Reviewed" },
  { value: "opted_out", label: "Opted out" },
];

export const CONTACTS_PAGE_SIZE = 10;

// Sortable columns → the DB column they map to.
export const CONTACT_SORT_COLUMNS: Record<string, string> = {
  name: "name",
  completed_job_date: "completed_job_date",
  status: "status",
  created_at: "created_at",
};

// ---------------------------------------------------------------- templates
export interface ReviewTemplate {
  id: string;
  company_id: string;
  name: string;
  channel: "sms" | "email";
  subject: string | null;
  body: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MergeTag {
  tag: string;
  label: string;
  sample: string;
}

// Supported merge tags + the sample values used in the live preview.
export const MERGE_TAGS: MergeTag[] = [
  { tag: "customer_name", label: "Customer name", sample: "Jane Smith" },
  { tag: "company_name", label: "Company name", sample: "Steel City Roofing" },
  { tag: "service", label: "Service", sample: "Roof Replacement" },
  { tag: "technician", label: "Technician", sample: "Mike" },
  { tag: "review_link", label: "Review link", sample: "https://g.page/r/abc123/review" },
  { tag: "city", label: "City", sample: "Pittsburgh" },
];

export const MERGE_SAMPLE: Record<string, string> = Object.fromEntries(MERGE_TAGS.map((t) => [t.tag, t.sample]));

// Replace {{tag}} tokens with values; unknown tags are left untouched.
export function renderTemplate(body: string, values: Record<string, string>): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key) => values[key] ?? `{{${key}}}`);
}

// Rough SMS segment count (GSM-7, 160 chars/segment, 153 when concatenated).
export function smsSegments(len: number): number {
  if (len === 0) return 0;
  return len <= 160 ? 1 : Math.ceil(len / 153);
}

// ---------------------------------------------------------------- workflows
// Triggers are STANDARDIZED platform events (see @/lib/events). A workflow fires
// whenever the matching event is published, regardless of which CRM generated
// it. "MANUAL" is the one non-event trigger (started by hand).
export type WorkflowTrigger =
  | "JOB_COMPLETED"
  | "INVOICE_PAID"
  | "ESTIMATE_ACCEPTED"
  | "APPOINTMENT_COMPLETED"
  | "CUSTOMER_CREATED"
  | "CONTACT_IMPORTED"
  | "MANUAL";

export type StopCondition = "clicked_review_link" | "review_received" | "replied_stop";

export interface ReviewWorkflow {
  id: string;
  company_id: string;
  name: string;
  trigger_type: WorkflowTrigger;
  template_id: string | null;
  channel: "sms" | "email";
  delay_minutes: number;
  reminder_count: number;
  reminder_delay_minutes: number;
  stop_conditions: StopCondition[];
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const WORKFLOW_TRIGGERS: { value: WorkflowTrigger; label: string; description: string }[] = [
  { value: "JOB_COMPLETED", label: "Job Completed", description: "A job is marked complete in any connected CRM" },
  { value: "INVOICE_PAID", label: "Invoice Paid", description: "An invoice is paid in full" },
  { value: "ESTIMATE_ACCEPTED", label: "Estimate Accepted", description: "A customer approves an estimate" },
  { value: "APPOINTMENT_COMPLETED", label: "Appointment Completed", description: "An appointment wraps up" },
  { value: "CUSTOMER_CREATED", label: "Customer Created", description: "A new customer is added in a CRM" },
  { value: "CONTACT_IMPORTED", label: "Contact Imported", description: "A contact is imported or added" },
  { value: "MANUAL", label: "Manual", description: "You start it by hand" },
];

export const WORKFLOW_STOP_CONDITIONS: { value: StopCondition; label: string; description: string }[] = [
  { value: "clicked_review_link", label: "Customer clicked review link", description: "Stop once they open the review link" },
  { value: "review_received", label: "Review received", description: "Stop once a new review comes in" },
  { value: "replied_stop", label: "Customer replied STOP", description: "Stop if they opt out by text" },
];

export function triggerLabel(t: string): string {
  return WORKFLOW_TRIGGERS.find((x) => x.value === t)?.label ?? t;
}

// Turn a minute count into a short human phrase ("3 days", "2 hours", "45 min").
export function formatDelay(minutes: number): string {
  if (!minutes || minutes <= 0) return "Immediately";
  if (minutes % 1440 === 0) {
    const d = minutes / 1440;
    return `${d} day${d === 1 ? "" : "s"}`;
  }
  if (minutes % 60 === 0) {
    const h = minutes / 60;
    return `${h} hour${h === 1 ? "" : "s"}`;
  }
  return `${minutes} min`;
}

// Delay units the builder offers, with their minute multiplier.
export const DELAY_UNITS: { value: string; label: string; minutes: number }[] = [
  { value: "minutes", label: "Minutes", minutes: 1 },
  { value: "hours", label: "Hours", minutes: 60 },
  { value: "days", label: "Days", minutes: 1440 },
];

// Split a minute total into the largest clean {value, unit} for editing.
export function splitDelay(minutes: number): { value: number; unit: string } {
  if (minutes > 0 && minutes % 1440 === 0) return { value: minutes / 1440, unit: "days" };
  if (minutes > 0 && minutes % 60 === 0) return { value: minutes / 60, unit: "hours" };
  return { value: minutes, unit: "minutes" };
}

// ---------------------------------------------------------------- review links
// Base URL for tracked review short links (growth.steelscale.com/r/<code>).
export function reviewLinkBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_REVIEW_LINK_BASE ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "";
  return raw.replace(/\/$/, "");
}

// Full tracked URL for a request's short code.
export function reviewLinkUrl(code: string): string {
  const base = reviewLinkBase();
  return base ? `${base}/r/${code}` : `/r/${code}`;
}

// ---------------------------------------------------------------- conversations
export type ConversationStatus = "open" | "closed" | "archived";
export type MessageDirection = "inbound" | "outbound";

export interface ConversationListItem {
  id: string;
  contactId: string | null;
  name: string;
  phone: string;
  status: ConversationStatus;
  unread: number;
  lastMessageAt: string | null;
  lastPreview: string | null;
  lastDirection: MessageDirection | null;
}

export interface ConversationMessage {
  id: string;
  direction: MessageDirection;
  body: string;
  status: string;
  createdAt: string;
}

export const CONVERSATION_PAGE_SIZE = 25;

// ---------------------------------------------------------------- settings
export interface ReviewSettingsValues {
  google_review_url: string | null;
  business_name: string | null;
  request_signature: string | null;
  default_delay_minutes: number;
  default_reminder_count: number;
  timezone: string;
  sms_send_start_hour: number;
  sms_send_end_hour: number;
  quiet_hours_enabled: boolean;
  quiet_start_hour: number;
  quiet_end_hour: number;
}

export const DEFAULT_REVIEW_SETTINGS: ReviewSettingsValues = {
  google_review_url: null,
  business_name: null,
  request_signature: null,
  default_delay_minutes: 4320,
  default_reminder_count: 1,
  timezone: "America/New_York",
  sms_send_start_hour: 9,
  sms_send_end_hour: 20,
  quiet_hours_enabled: true,
  quiet_start_hour: 21,
  quiet_end_hour: 8,
};

export const US_TIMEZONES: { value: string; label: string }[] = [
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Phoenix", label: "Arizona (Phoenix)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
];

// 12-hour labels for an hour-of-day (0–24) select.
export function hourLabel(h: number): string {
  if (h === 0 || h === 24) return "12:00 AM";
  if (h === 12) return "12:00 PM";
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
}

export const HOUR_OPTIONS_0_23 = Array.from({ length: 24 }, (_, h) => ({ value: h, label: hourLabel(h) }));
export const HOUR_OPTIONS_1_24 = Array.from({ length: 24 }, (_, i) => ({ value: i + 1, label: hourLabel(i + 1) }));

// Short label for a message timestamp in the conversation list ("2m", "3h", "Mon").
export function shortTime(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
