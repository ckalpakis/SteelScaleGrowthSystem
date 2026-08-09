// =============================================================================
// Onboarding provisioning — configuration & policy. Server-safe (no secrets).
// =============================================================================

import { GHL_SCOPES } from "@/lib/ghl/config";

/** Lease duration for a claimed run; a stale lease past this can be re-claimed. */
export const PROVISIONING_LEASE_SECONDS = Number(process.env.PROVISIONING_LEASE_SECONDS ?? 300);

/** Bounded retries applied ONLY to transient API failures inside a step. */
export const PROVISIONING_MAX_ATTEMPTS = Number(process.env.PROVISIONING_MAX_ATTEMPTS ?? 4);

/** Bounded polls when an official snapshot-apply status is available. */
export const SNAPSHOT_POLL_MAX_ATTEMPTS = Number(process.env.SNAPSHOT_POLL_MAX_ATTEMPTS ?? 10);

/**
 * The configured review snapshot to load into a new location. Names/IDs are
 * non-secret and only used for admin instructions + (if ever) automated apply.
 */
export const REVIEW_SNAPSHOT_ID = process.env.GHL_REVIEW_SNAPSHOT_ID ?? "";
export const REVIEW_SNAPSHOT_NAME = process.env.GHL_REVIEW_SNAPSHOT_NAME ?? "Steel Scale Review System";

/**
 * Optional placeholder for text_1_image_link. Blank/undefined means "leave as-is
 * / do not invent a URL" — never fabricate an image URL.
 */
export const TEXT_1_IMAGE_PLACEHOLDER = process.env.GHL_TEXT_1_IMAGE_PLACEHOLDER || undefined;

/** How long the one-time webhook secret handoff stays retrievable. */
export const WEBHOOK_SECRET_HANDOFF_TTL_MINUTES = Number(process.env.WEBHOOK_SECRET_HANDOFF_TTL_MINUTES ?? 60);

export interface ProvisioningPolicy {
  /**
   * When true (default), custom values are NOT updated until the snapshot is
   * confirmed applied (or manually marked complete), because the snapshot may
   * create the required custom values. A manual snapshot therefore parks the run
   * at needs_action rather than proceeding.
   */
  snapshotGatesCustomValues: boolean;
  /**
   * When false (the default), the engine does NOT read/write GHL custom values
   * via the API. Instead it emits a guided admin task listing the exact values
   * to enter by hand in the sub-account, and skips the location-token +
   * update-custom-values steps. This is the default because writing custom
   * values requires a sub-account (location) token with
   * `locations/customValues.write`, which some GHL plans don't grant. Set
   * `GHL_AUTOMATE_CUSTOM_VALUES=true` to re-enable full API automation.
   */
  automateCustomValues: boolean;
  /**
   * When false (the default), the engine does NOT create the sub-account via the
   * API. Creating a sub-account is an agency action GHL blocks for Private
   * Integration Tokens (403) and gates behind higher plans even for OAuth.
   * Instead the operator creates it in GHL (e.g. from the snapshot) and pastes
   * its Location ID into the dashboard; the engine records it and continues. Set
   * `GHL_AUTOMATE_LOCATION_CREATION=true` to create sub-accounts via the API.
   */
  automateLocationCreation: boolean;
}

export const DEFAULT_POLICY: ProvisioningPolicy = {
  snapshotGatesCustomValues: true,
  automateCustomValues: process.env.GHL_AUTOMATE_CUSTOM_VALUES === "true",
  automateLocationCreation: process.env.GHL_AUTOMATE_LOCATION_CREATION === "true",
};

/**
 * Scopes required for the FULL flow including API custom-value writes. Only
 * asserted when `automateCustomValues` is on.
 */
export const PROVISIONING_REQUIRED_SCOPES = [
  GHL_SCOPES.locationsWrite,
  GHL_SCOPES.locationsRead,
  GHL_SCOPES.customValuesRead,
  GHL_SCOPES.customValuesWrite,
] as const;

/**
 * Scopes required when custom values are handled manually (the default): the
 * engine only creates/reads the sub-account, so no custom-value scopes are needed.
 */
export const PROVISIONING_LOCATION_SCOPES = [GHL_SCOPES.locationsWrite, GHL_SCOPES.locationsRead] as const;

// Admin task types.
export const TASK_LOAD_SNAPSHOT = "load_review_snapshot";
export const TASK_INSTALL_WEBHOOK = "install_review_webhook";
export const TASK_MISSING_CUSTOM_VALUE = "missing_custom_value";
export const TASK_CUSTOM_VALUE_MISMATCH = "custom_value_mismatch";
/** Manual-mode task: operator enters the custom values by hand in the sub-account. */
export const TASK_SET_CUSTOM_VALUES = "set_custom_values";
/** Manual-mode task: operator creates the sub-account in GHL and enters its Location ID. */
export const TASK_ENTER_LOCATION_ID = "enter_location_id";
