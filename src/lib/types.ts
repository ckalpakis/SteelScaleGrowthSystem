// Shared domain types and the lead pipeline definition.
// Keeping the pipeline in one place makes it trivial to add/rename stages.

export type LeadStatus =
  | "new"
  | "contacted"
  | "estimate_scheduled"
  | "won"
  | "lost";

export interface PipelineStage {
  value: LeadStatus;
  label: string;
  /** Tailwind classes for the status badge. */
  badgeClass: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { value: "new", label: "New", badgeClass: "bg-blue-100 text-blue-800" },
  { value: "contacted", label: "Contacted", badgeClass: "bg-amber-100 text-amber-800" },
  { value: "estimate_scheduled", label: "Estimate Scheduled", badgeClass: "bg-purple-100 text-purple-800" },
  { value: "won", label: "Won", badgeClass: "bg-green-100 text-green-800" },
  { value: "lost", label: "Lost", badgeClass: "bg-gray-200 text-gray-700" },
];

export function stageFor(status: string): PipelineStage {
  return PIPELINE_STAGES.find((s) => s.value === status) ?? PIPELINE_STAGES[0];
}

export interface Client {
  id: string;
  slug: string;
  business_name: string;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  brand_color: string | null;
  google_review_link: string | null;
  services: string[] | null;
  service_area: string | null;
  hero_headline: string | null;
  hero_subheadline: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  client_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  service: string | null;
  message: string | null;
  status: LeadStatus;
  created_at: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  client_id: string;
  body: string;
  created_at: string;
}
