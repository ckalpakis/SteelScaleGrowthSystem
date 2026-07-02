// Shared domain types and the lead pipeline definition.
// Keeping the pipeline in one place makes it trivial to add/rename stages.
// Field names mirror supabase/migrations/0001_init.sql.

export type LeadStatus =
  | "new"
  | "contacted"
  | "estimate_scheduled"
  | "won"
  | "lost";

export interface PipelineStage {
  value: LeadStatus;
  label: string;
  /** Tailwind classes for the status badge / accent. */
  badgeClass: string;
  dotClass: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { value: "new", label: "New", badgeClass: "bg-blue-100 text-blue-800", dotClass: "bg-blue-500" },
  { value: "contacted", label: "Contacted", badgeClass: "bg-amber-100 text-amber-800", dotClass: "bg-amber-500" },
  { value: "estimate_scheduled", label: "Estimate Scheduled", badgeClass: "bg-purple-100 text-purple-800", dotClass: "bg-purple-500" },
  { value: "won", label: "Won", badgeClass: "bg-green-100 text-green-800", dotClass: "bg-green-500" },
  { value: "lost", label: "Lost", badgeClass: "bg-gray-200 text-gray-700", dotClass: "bg-gray-400" },
];

export function stageFor(status: string): PipelineStage {
  return PIPELINE_STAGES.find((s) => s.value === status) ?? PIPELINE_STAGES[0];
}

// `clients` table — core tenant identity.
export interface Client {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  /** Plan tier (1=Starter, 2=Growth, 3=Pro). Agency-admin controlled. */
  tier: number;
  created_at: string;
  updated_at: string;
}

// Feature entitlement: automated email/SMS review requests are a Tier 2+ perk.
export function hasReviewAutomation(client: Client | null | undefined): boolean {
  return (client?.tier ?? 1) >= 2;
}

export const TIER_LABELS: Record<number, string> = {
  1: "Tier 1 — Starter",
  2: "Tier 2 — Growth",
  3: "Tier 3 — Pro",
};

// Structured content stored as jsonb on client_settings.
export interface ServiceDetail {
  slug: string;
  name: string;
  description: string;
  image_url?: string | null;
}

export interface GalleryItem {
  url: string;
  caption?: string | null;
}

export interface BadgeLogo {
  url: string;
  label?: string | null;
}

export interface Stat {
  value: string; // e.g. "5,000+"
  label: string; // e.g. "Roofs Installed"
}

export interface ProcessStep {
  title: string;
  description: string;
}

export interface Testimonial {
  quote: string;
  name: string;
  location?: string | null;
  rating?: number | null; // 0–5
}

export interface FinancingOption {
  title: string;
  description: string;
}

export interface Faq {
  question: string;
  answer: string;
}

// `client_settings` table — branding, contact, and website content
// (1:1 with a client).
export interface ClientSettings {
  id: string;
  client_id: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  brand_color: string | null;
  secondary_color: string | null;
  google_review_link: string | null;
  // Review-request automation (migration 0013)
  auto_review_enabled: boolean | null;
  auto_review_delay_days: number | null;
  review_request_message: string | null;
  services: string[] | null;
  service_area: string | null;
  hero_headline: string | null;
  hero_subheadline: string | null;
  // Customizable homepage section headings (migration 0008). Wrap a word in
  // *asterisks* to accent it in the brand color.
  work_heading: string | null;
  services_heading: string | null;
  services_subheading: string | null;
  // Website content (migration 0002)
  tagline: string | null;
  primary_location: string | null;
  hero_image_url: string | null;
  service_areas: string[] | null;
  service_details: ServiceDetail[] | null;
  gallery: GalleryItem[] | null;
  value_props: string[] | null;
  badges: string[] | null;
  badge_logos: BadgeLogo[] | null;
  about_headline: string | null;
  about_text: string | null;
  rating: number | null;
  review_count: number | null;
  facebook_url: string | null;
  instagram_url: string | null;
  google_business_url: string | null;
  promo_text: string | null;
  address: string | null;
  hours: string | null;
  // Premium content sections (migration 0005)
  stats: Stat[] | null;
  process_steps: ProcessStep[] | null;
  testimonials: Testimonial[] | null;
  financing: FinancingOption[] | null;
  faqs: Faq[] | null;
  created_at: string;
  updated_at: string;
}

// `leads` table.
export interface Lead {
  id: string;
  client_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  service_needed: string | null;
  message: string | null;
  source: string | null;
  status: LeadStatus;
  /** Estimated job value in dollars, set by the client (migration 0010). */
  estimate_value: number | null;
  /** When the lead was marked "won" — starts the review-request delay clock. */
  won_at: string | null;
  /** When a review request was sent (so we never ask the same customer twice). */
  review_requested_at: string | null;
  created_at: string;
  updated_at: string;
}

// `lead_notes` table.
export interface LeadNote {
  id: string;
  lead_id: string;
  user_id: string | null;
  note: string;
  created_at: string;
  updated_at: string;
}

// Convenience: the business display name, preferring the editable settings
// value and falling back to the client's canonical name.
export function businessName(client: Client, settings: ClientSettings | null): string {
  return settings?.business_name?.trim() || client.name;
}
