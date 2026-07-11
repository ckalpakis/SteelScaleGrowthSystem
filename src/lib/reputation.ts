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
