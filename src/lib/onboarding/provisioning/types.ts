// =============================================================================
// Onboarding provisioning engine — types. Server-only.
//
// The engine is fully dependency-injected: it talks to a `ProvisioningStore`
// (DB), a `GhlProvisioningClient` (GHL), a clock, id/secret generators, and a
// logger. Production wires the real Supabase + GHL implementations; tests wire
// in-memory fakes so every step/outcome is exercised deterministically.
// =============================================================================

import type {
  AdminTask,
  CanonicalCustomValueKey,
  ClientAccount,
  GhlConnection,
  GhlLocation,
  ProvisioningRun,
  ProvisioningStep,
  ProvisioningStepKey,
  SnapshotStatus,
} from "@/lib/onboarding/types";
import type { CustomValue, Snapshot, SnapshotAutomationResult } from "@/lib/ghl/types";

// Ordered step keys the engine runs, resuming from the first incomplete one.
export const STEP_ORDER: ProvisioningStepKey[] = [
  "validate_submission",
  "create_ghl_location",
  "obtain_location_token",
  "apply_snapshot",
  "discover_custom_values",
  "update_custom_values",
  "create_webhook_credential",
  "run_health_checks",
  "finalize",
];

// Terminal outcome of a single step.
export type StepStatus = "complete" | "skipped" | "manual_required" | "failed";

export interface StepOutcome {
  status: StepStatus;
  errorCode?: string;
  /** Safe, non-secret message stored on the step/run. */
  safeMessage?: string;
  /** Non-secret metadata persisted on the step. */
  metadata?: Record<string, unknown>;
  /**
   * When true on a manual_required/needs_action outcome, the run stops and
   * becomes needs_action (a human must act before continuing).
   */
  gate?: boolean;
}

export type RunOutcome =
  | { result: "complete" }
  | { result: "needs_action"; step: ProvisioningStepKey; safeMessage: string }
  | { result: "failed"; step: ProvisioningStepKey; errorCode: string; safeMessage: string }
  | { result: "skipped"; reason: "not_acquired" };

// -------------------------------------------------------- GHL client the engine needs
export interface GhlProvisioningClient {
  createLocation: (
    input: import("@/lib/ghl/types").CreateLocationInput,
    idempotency?: import("@/lib/ghl/types").CreateLocationIdempotency,
  ) => Promise<import("@/lib/ghl/types").CreateLocationResult>;
  getLocation: (locationId: string) => Promise<import("@/lib/ghl/types").GhlLocationRecord>;
  getLocationAccessToken: (locationId: string, companyId?: string) => Promise<import("@/lib/ghl/types").LocationAccessToken>;
  listLocationCustomValues: (locationId: string, locationToken: string) => Promise<CustomValue[]>;
  updateLocationCustomValue: (
    locationId: string,
    customValueId: string,
    input: { name?: string; value: string },
    locationToken: string,
  ) => Promise<CustomValue>;
  listSnapshots: () => Promise<Snapshot[]>;
  snapshotAutomationSupport: () => SnapshotAutomationResult;
  /** Verify the agency token holds the given scopes (throws on missing). */
  assertScopes: (required: readonly string[]) => void;
  /**
   * Optional: only present if an OFFICIAL public snapshot-apply API exists and
   * is implemented. When absent, the engine takes the manual (admin task) path.
   */
  applySnapshot?: (locationId: string, snapshotId: string) => Promise<{ statusId?: string }>;
  getSnapshotStatus?: (locationId: string, statusId: string) => Promise<{ status: "pending" | "applied" | "failed" }>;
}

// -------------------------------------------------------- webhook credential handoff
export interface CreatedWebhookCredential {
  id: string;
  publicId: string;
  /** Raw secret — returned to the engine ONCE for the encrypted handoff. Never logged. */
  rawSecret: string;
}

// -------------------------------------------------------- store the engine needs
export interface ProvisioningStore {
  // run + lease
  claimRun(runId: string, workerId: string, leaseSeconds: number): Promise<boolean>;
  /** Atomically claim the next drainable run (queued or stale lease). */
  claimNextRun(workerId: string, leaseSeconds: number): Promise<string | null>;
  releaseRun(runId: string): Promise<void>;
  getRun(runId: string): Promise<ProvisioningRun | null>;
  setRun(runId: string, patch: Partial<ProvisioningRun>): Promise<void>;

  // client + connection
  getClientAccount(id: string): Promise<ClientAccount | null>;
  setClientStatus(id: string, status: ClientAccount["status"]): Promise<void>;
  getActiveConnection(): Promise<GhlConnection | null>;

  // location record
  getLocation(clientAccountId: string): Promise<GhlLocation | null>;
  ensureLocation(clientAccountId: string): Promise<GhlLocation>;
  setLocation(clientAccountId: string, patch: Partial<GhlLocation>): Promise<void>;
  setSnapshotStatus(clientAccountId: string, status: SnapshotStatus): Promise<void>;

  // steps
  listSteps(runId: string): Promise<ProvisioningStep[]>;
  upsertStep(runId: string, key: ProvisioningStepKey, patch: Partial<ProvisioningStep>): Promise<void>;

  // custom value mappings (canonical → expected GHL keys/aliases)
  getRequiredMappings(): Promise<CustomValueMappingRow[]>;

  // admin tasks
  findOpenAdminTask(clientAccountId: string, taskType: string): Promise<AdminTask | null>;
  createAdminTask(input: CreateAdminTaskInput): Promise<AdminTask>;

  // webhook credential
  getWebhookCredential(clientAccountId: string): Promise<{ id: string; publicId: string; enabled: boolean } | null>;
  createWebhookCredential(input: {
    clientAccountId: string;
    ghlLocationId: string | null;
    publicId: string;
    secretHash: string;
    secretCiphertext: string | null;
    secretExpiresAt: string | null;
  }): Promise<CreatedWebhookCredentialRow>;
}

export interface CustomValueMappingRow {
  canonical_key: CanonicalCustomValueKey;
  expected_ghl_key: string | null;
  expected_display_name: string | null;
  ghl_custom_value_id: string | null;
  required: boolean;
  value_type: string;
  /** Legacy key aliases (explicitly configured), tried after the primary key. */
  legacy_aliases?: string[];
}

export interface CreateAdminTaskInput {
  clientAccountId: string;
  provisioningRunId: string | null;
  taskType: string;
  title: string;
  instructions: string;
}

export interface CreatedWebhookCredentialRow {
  id: string;
  publicId: string;
}
