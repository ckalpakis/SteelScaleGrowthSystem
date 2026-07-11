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
