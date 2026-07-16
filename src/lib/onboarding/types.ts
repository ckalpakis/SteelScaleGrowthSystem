// =============================================================================
// GHL client onboarding — domain types & status helpers.
//
// Status values live as `as const` arrays with derived union types, so the rest
// of the app references typed constants instead of scattering raw strings. Row
// interfaces use snake_case to mirror the database columns (migration 0029).
// No UI and no GHL API calls here — types only.
// =============================================================================

// ---------------------------------------------------------------- status sets
export const INVITATION_STATUSES = ["pending", "opened", "submitted", "expired", "revoked"] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const CLIENT_ACCOUNT_STATUSES = ["onboarding", "provisioning", "needs_action", "active", "paused", "failed"] as const;
export type ClientAccountStatus = (typeof CLIENT_ACCOUNT_STATUSES)[number];

export const GHL_CONNECTION_STATUSES = ["active", "inactive", "error"] as const;
export type GhlConnectionStatus = (typeof GHL_CONNECTION_STATUSES)[number];

export const GHL_AUTH_TYPES = ["oauth", "private_integration", "api_key"] as const;
export type GhlAuthType = (typeof GHL_AUTH_TYPES)[number];

export const SNAPSHOT_STATUSES = ["not_started", "pending", "applied", "manual_required", "failed"] as const;
export type SnapshotStatus = (typeof SNAPSHOT_STATUSES)[number];

export const STEP_PROGRESS_STATUSES = ["not_started", "pending", "complete", "failed"] as const;
export type StepProgressStatus = (typeof STEP_PROGRESS_STATUSES)[number]; // custom_values_status, provider_status

export const PROVISIONING_RUN_STATUSES = ["queued", "running", "needs_action", "complete", "failed"] as const;
export type ProvisioningRunStatus = (typeof PROVISIONING_RUN_STATUSES)[number];

export const PROVISIONING_STEP_STATUSES = ["pending", "running", "complete", "skipped", "manual_required", "failed"] as const;
export type ProvisioningStepStatus = (typeof PROVISIONING_STEP_STATUSES)[number];

export const PROVISIONING_STEP_KEYS = [
  "validate_submission",
  "create_ghl_location",
  "obtain_location_token",
  "apply_snapshot",
  "discover_custom_values",
  "update_custom_values",
  "create_webhook_credential",
  "run_health_checks",
  "finalize",
] as const;
export type ProvisioningStepKey = (typeof PROVISIONING_STEP_KEYS)[number];

export const ADMIN_TASK_STATUSES = ["open", "complete", "dismissed"] as const;
export type AdminTaskStatus = (typeof ADMIN_TASK_STATUSES)[number];

export const CUSTOM_VALUE_TYPES = ["string", "number", "boolean", "url", "image_url", "enum"] as const;
export type CustomValueType = (typeof CUSTOM_VALUE_TYPES)[number];

/** Generic membership guard so callers never compare raw strings. */
export function isOneOf<T extends readonly string[]>(set: T, value: unknown): value is T[number] {
  return typeof value === "string" && (set as readonly string[]).includes(value);
}

// ------------------------------------------------- canonical custom-value keys
export const CANONICAL_CUSTOM_VALUE_KEYS = [
  "google_review_link",
  "logo_link",
  "text_1_image_link",
  "business_owner_name",
  "business_name",
  "email_sending_domain",
  "minimum_review_requests_per_14_days",
  "follow_up_count",
  "review_requests_per_14_days",
  "ask_for_referral",
] as const;
export type CanonicalCustomValueKey = (typeof CANONICAL_CUSTOM_VALUE_KEYS)[number];

/**
 * Canonical → GHL custom-value mapping template (mirrors the seed in migration
 * 0029). `expected_ghl_key` uses the real GHL names, including legacy ones.
 *   - follow_up_count → legacy "service_type"
 *   - email_sending_domain / ask_for_referral → the legacy numeric-prefixed keys
 */
export const CANONICAL_CUSTOM_VALUE_MAP: {
  canonical_key: CanonicalCustomValueKey;
  expected_ghl_key: string;
  required: boolean;
  value_type: CustomValueType;
}[] = [
  { canonical_key: "google_review_link", expected_ghl_key: "google_review_link", required: true, value_type: "url" },
  { canonical_key: "logo_link", expected_ghl_key: "logo_link", required: true, value_type: "image_url" },
  { canonical_key: "text_1_image_link", expected_ghl_key: "text_1_image_link", required: false, value_type: "image_url" },
  { canonical_key: "business_owner_name", expected_ghl_key: "business_owner_name", required: true, value_type: "string" },
  { canonical_key: "business_name", expected_ghl_key: "business_name", required: true, value_type: "string" },
  { canonical_key: "email_sending_domain", expected_ghl_key: "9_email_sending_subdomain_after_the_", required: true, value_type: "string" },
  { canonical_key: "minimum_review_requests_per_14_days", expected_ghl_key: "minimum_review_requests_per_14_days", required: true, value_type: "number" },
  { canonical_key: "follow_up_count", expected_ghl_key: "service_type", required: true, value_type: "number" },
  { canonical_key: "review_requests_per_14_days", expected_ghl_key: "review_requests_per_14_days", required: true, value_type: "number" },
  { canonical_key: "ask_for_referral", expected_ghl_key: "10_ask_for_a_referral_if_customer_has_already_left_a_review_yes_or_no", required: true, value_type: "enum" },
];

// ---------------------------------------------------------------- row types
export interface OnboardingInvitation {
  id: string;
  public_token_hash: string;
  client_email: string | null;
  status: InvitationStatus;
  expires_at: string;
  opened_at: string | null;
  submitted_at: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientAccount {
  id: string;
  onboarding_invitation_id: string | null;
  legal_business_name: string;
  public_business_name: string;
  owner_first_name: string;
  primary_email: string;
  primary_phone: string;
  website_url: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  timezone: string | null;
  google_review_link: string | null;
  logo_url: string | null;
  primary_brand_color: string | null;
  email_sending_domain: string | null;
  follow_up_count: number;
  review_request_limit_14_days: number;
  current_review_requests_14_days: number;
  ask_for_referral: boolean;
  status: ClientAccountStatus;
  created_at: string;
  updated_at: string;
}

export interface GhlConnection {
  id: string;
  ghl_company_id: string | null;
  authentication_type: GhlAuthType;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  scopes: string[];
  status: GhlConnectionStatus;
  last_verified_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GhlLocation {
  id: string;
  client_account_id: string;
  ghl_location_id: string | null;
  ghl_company_id: string | null;
  snapshot_id: string | null;
  snapshot_status: SnapshotStatus;
  custom_values_status: StepProgressStatus;
  provider_status: StepProgressStatus;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GhlCustomValueMapping {
  id: string;
  canonical_key: CanonicalCustomValueKey;
  expected_ghl_key: string | null;
  expected_display_name: string | null;
  ghl_custom_value_id: string | null;
  required: boolean;
  value_type: CustomValueType;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProvisioningRun {
  id: string;
  client_account_id: string;
  ghl_location_id: string | null;
  status: ProvisioningRunStatus;
  current_step: ProvisioningStepKey | null;
  attempt_count: number;
  started_at: string | null;
  completed_at: string | null;
  error_code: string | null;
  safe_error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProvisioningStep {
  id: string;
  provisioning_run_id: string;
  step_key: ProvisioningStepKey;
  status: ProvisioningStepStatus;
  attempt_count: number;
  started_at: string | null;
  completed_at: string | null;
  error_code: string | null;
  safe_error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AdminTask {
  id: string;
  client_account_id: string;
  provisioning_run_id: string | null;
  task_type: string;
  title: string;
  instructions: string | null;
  status: AdminTaskStatus;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
