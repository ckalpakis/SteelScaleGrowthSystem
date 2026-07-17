// =============================================================================
// Onboarding provisioning — durable steps. Server-only.
//
// Each step is idempotent and returns a StepOutcome. Steps read what they need
// from the store (so they survive resume across process invocations) and hold
// only ephemeral cross-step state (the location token) in `ctx.state`. Bounded
// retries apply ONLY to transient GHL failures; validation/config failures are
// terminal. No secret is ever logged or placed in step/run metadata.
// =============================================================================

import { isTransientGhlError, GhlDuplicateError, GhlError } from "@/lib/ghl/errors";
import { withRetry } from "@/lib/integration/retry";
import type { ClientAccount, GhlConnection, ProvisioningRun } from "@/lib/onboarding/types";
import type {
  GeneratedWebhookSecret,
} from "@/lib/onboarding/provisioning/webhook";
import type {
  GhlProvisioningClient,
  ProvisioningStore,
  StepOutcome,
} from "@/lib/onboarding/provisioning/types";
import { expectedValueFor, matchMapping } from "@/lib/onboarding/provisioning/matching";
import {
  DEFAULT_POLICY,
  PROVISIONING_MAX_ATTEMPTS,
  PROVISIONING_REQUIRED_SCOPES,
  SNAPSHOT_POLL_MAX_ATTEMPTS,
  TASK_CUSTOM_VALUE_MISMATCH,
  TASK_INSTALL_WEBHOOK,
  TASK_LOAD_SNAPSHOT,
  TASK_MISSING_CUSTOM_VALUE,
  TEXT_1_IMAGE_PLACEHOLDER,
  type ProvisioningPolicy,
} from "@/lib/onboarding/provisioning/config";

export interface Logger {
  info(e: Record<string, unknown>): void;
  warn(e: Record<string, unknown>): void;
  error(e: Record<string, unknown>): void;
}

export interface StepContext {
  run: ProvisioningRun;
  client: ClientAccount;
  connection: GhlConnection;
  store: ProvisioningStore;
  ghl: GhlProvisioningClient;
  policy: ProvisioningPolicy;
  now: () => Date;
  logger: Logger;
  sleep?: (ms: number) => Promise<void>;
  /** Injectable secret generator (tests). */
  makeWebhookSecret: () => GeneratedWebhookSecret;
  /** Configured review snapshot (name/id), resolved from env by the engine. */
  snapshot: { id: string; name: string };
  state: { locationToken?: string };
}

const ok = (metadata?: Record<string, unknown>): StepOutcome => ({ status: "complete", metadata });
const fail = (errorCode: string, safeMessage: string): StepOutcome => ({ status: "failed", errorCode, safeMessage });
const needsAction = (safeMessage: string, metadata?: Record<string, unknown>): StepOutcome => ({
  status: "manual_required",
  safeMessage,
  gate: true,
  metadata,
});

/** Retry a transient GHL operation with bounded attempts. */
function runTransient<T>(ctx: StepContext, fn: () => Promise<T>): Promise<T> {
  return withRetry(fn, {
    maxAttempts: PROVISIONING_MAX_ATTEMPTS,
    baseDelayMs: 200,
    retryable: isTransientGhlError,
    sleep: ctx.sleep,
  });
}

function safeGhlMessage(err: unknown): string {
  return err instanceof GhlError ? err.safeMessage : "Unexpected error contacting the provider.";
}

async function ensureLocationToken(ctx: StepContext): Promise<string> {
  if (ctx.state.locationToken) return ctx.state.locationToken;
  const loc = await ctx.store.getLocation(ctx.client.id);
  const gid = loc?.ghl_location_id;
  if (!gid) throw new Error("location id missing when obtaining location token");
  const token = await runTransient(ctx, () => ctx.ghl.getLocationAccessToken(gid, loc?.ghl_company_id ?? undefined));
  ctx.state.locationToken = token.accessToken;
  return token.accessToken;
}

// ---------------------------------------------------------------- STEP 1
export async function validateSubmission(ctx: StepContext): Promise<StepOutcome> {
  const c = ctx.client;
  const problems: string[] = [];

  if (!c.public_business_name?.trim()) problems.push("public business name");
  if (!c.legal_business_name?.trim()) problems.push("legal business name");
  if (!c.owner_first_name?.trim()) problems.push("owner first name");
  if (!c.primary_email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.primary_email)) problems.push("contact email");
  if (!/^\+?[1-9]\d{7,14}$/.test((c.primary_phone ?? "").replace(/[^\d+]/g, ""))) problems.push("normalized phone");
  if (!isHttps(c.website_url)) problems.push("https website");
  if (!isHttps(c.google_review_link)) problems.push("https google review link");
  if (c.logo_url && !isHttps(c.logo_url)) problems.push("logo URL");
  if (!isValidTimezone(c.timezone)) problems.push("time zone");
  if (!(c.follow_up_count >= 0 && c.follow_up_count <= 3)) problems.push("follow-up count");
  if (!(c.review_request_limit_14_days >= 0)) problems.push("request limit");

  if (problems.length > 0) {
    return fail("invalid_submission", `Submission is missing or invalid: ${problems.join(", ")}.`);
  }

  if (!ctx.connection || ctx.connection.status !== "active") {
    return fail("no_active_connection", "No active provider connection is configured.");
  }

  return ok();
}

// ---------------------------------------------------------------- STEP 2
export async function createGhlLocation(ctx: StepContext): Promise<StepOutcome> {
  const c = ctx.client;
  const loc = await ctx.store.ensureLocation(c.id);

  // Idempotent: if we already recorded a location id, verify + finish. Never
  // create a second location on retry.
  if (loc.ghl_location_id) {
    try {
      const rec = await runTransient(ctx, () => ctx.ghl.getLocation(loc.ghl_location_id as string));
      await ctx.store.setLocation(c.id, { ghl_company_id: rec.companyId ?? loc.ghl_company_id, provider_status: "complete" });
      return ok({ ghl_location_id: loc.ghl_location_id, reused: true });
    } catch (err) {
      if (isTransientGhlError(err)) return fail("verify_location_failed", safeGhlMessage(err));
      return fail("verify_location_failed", safeGhlMessage(err));
    }
  }

  ctx.ghl.assertScopes(PROVISIONING_REQUIRED_SCOPES);

  let created;
  try {
    created = await runTransient(ctx, () =>
      ctx.ghl.createLocation(
        {
          name: c.public_business_name,
          legalName: c.legal_business_name,
          email: c.primary_email,
          phone: c.primary_phone,
          website: c.website_url ?? undefined,
          address: c.address_line_1 ?? undefined,
          city: c.city ?? undefined,
          state: c.state ?? undefined,
          country: c.country ?? undefined,
          postalCode: c.postal_code ?? undefined,
          timezone: c.timezone ?? undefined,
        },
        // Defense-in-depth idempotency: consult our DB inside the create call.
        { getExistingLocationId: async () => (await ctx.store.getLocation(c.id))?.ghl_location_id ?? null },
      ),
    );
  } catch (err) {
    if (err instanceof GhlDuplicateError) {
      return needsAction("A provider location may already exist for this client; needs manual reconciliation.", {
        error_code: "duplicate_location",
      });
    }
    return fail("create_location_failed", safeGhlMessage(err));
  }

  // Persist the id IMMEDIATELY. Retry only the DB write (never re-create the
  // location) so a transient write failure can't spawn a second location.
  await withRetry(() => ctx.store.setLocation(c.id, { ghl_location_id: created.locationId }), {
    maxAttempts: PROVISIONING_MAX_ATTEMPTS,
    baseDelayMs: 100,
    sleep: ctx.sleep,
  });

  // Verify it exists + capture company/agency id.
  try {
    const rec = await runTransient(ctx, () => ctx.ghl.getLocation(created.locationId));
    await ctx.store.setLocation(c.id, { ghl_company_id: rec.companyId ?? ctx.connection.ghl_company_id, provider_status: "complete" });
    await ctx.store.setRun(ctx.run.id, { ghl_location_id: created.locationId });
  } catch (err) {
    return fail("verify_location_failed", safeGhlMessage(err));
  }

  return ok({ ghl_location_id: created.locationId, created: true });
}

// ---------------------------------------------------------------- STEP 3
export async function obtainLocationToken(ctx: StepContext): Promise<StepOutcome> {
  // Verify the scopes location-scoped calls will require.
  try {
    ctx.ghl.assertScopes(PROVISIONING_REQUIRED_SCOPES);
  } catch (err) {
    return fail("missing_scopes", err instanceof GhlError ? err.safeMessage : "Missing required scopes.");
  }
  try {
    await ensureLocationToken(ctx); // mints + caches ephemerally (never persisted)
  } catch (err) {
    if (isTransientGhlError(err)) return fail("location_token_failed", safeGhlMessage(err));
    return fail("location_token_failed", safeGhlMessage(err));
  }
  return ok();
}

// ---------------------------------------------------------------- STEP 4
export async function applySnapshot(ctx: StepContext): Promise<StepOutcome> {
  const loc = await ctx.store.ensureLocation(ctx.client.id);
  const locationId = loc.ghl_location_id;
  if (!locationId) return fail("no_location", "No provider location id is available to configure.");

  // Resume path: a human already marked the manual snapshot complete.
  if (loc.snapshot_status === "applied") return ok({ snapshot: "already_applied" });

  const support = ctx.ghl.snapshotAutomationSupport();

  // Automated path — only if an official implemented API is present.
  if (support.supported && ctx.ghl.applySnapshot && ctx.ghl.getSnapshotStatus && ctx.snapshot.id) {
    try {
      const { statusId } = await runTransient(ctx, () => ctx.ghl.applySnapshot!(locationId, ctx.snapshot.id));
      await ctx.store.setLocation(ctx.client.id, { snapshot_id: ctx.snapshot.id, snapshot_status: "pending" });
      if (statusId) {
        for (let i = 0; i < SNAPSHOT_POLL_MAX_ATTEMPTS; i++) {
          const s = await runTransient(ctx, () => ctx.ghl.getSnapshotStatus!(locationId, statusId));
          if (s.status === "applied") break;
          if (s.status === "failed") return fail("snapshot_failed", "The snapshot could not be applied.");
          await (ctx.sleep ?? defaultSleep)(500);
          if (i === SNAPSHOT_POLL_MAX_ATTEMPTS - 1) {
            return needsAction("The snapshot is still applying; needs a manual check.");
          }
        }
      }
      await ctx.store.setSnapshotStatus(ctx.client.id, "applied");
      return ok({ snapshot: "applied", snapshot_id: ctx.snapshot.id });
    } catch (err) {
      return fail("snapshot_apply_failed", safeGhlMessage(err));
    }
  }

  // Manual path — no official API. Create a bounded admin task and park.
  await ctx.store.setSnapshotStatus(ctx.client.id, "manual_required");
  const existing = await ctx.store.findOpenAdminTask(ctx.client.id, TASK_LOAD_SNAPSHOT);
  if (!existing) {
    await ctx.store.createAdminTask({
      clientAccountId: ctx.client.id,
      provisioningRunId: ctx.run.id,
      taskType: TASK_LOAD_SNAPSHOT,
      title: "Load Steel Scale review snapshot",
      instructions: snapshotInstructions(ctx.client, locationId, ctx.snapshot),
    });
  }

  // Default policy gates custom values behind the snapshot (it may create them).
  const gate = ctx.policy.snapshotGatesCustomValues;
  return {
    status: "manual_required",
    safeMessage: "Waiting for the review snapshot to be loaded manually.",
    gate,
    metadata: { snapshot_status: "manual_required" },
  };
}

// ---------------------------------------------------------------- STEP 5
export async function discoverCustomValues(ctx: StepContext): Promise<StepOutcome> {
  const loc = await ctx.store.ensureLocation(ctx.client.id);
  const locationId = loc.ghl_location_id;
  if (!locationId) return fail("no_location", "No provider location id is available.");

  let values;
  try {
    const token = await ensureLocationToken(ctx);
    values = await runTransient(ctx, () => ctx.ghl.listLocationCustomValues(locationId, token));
  } catch (err) {
    return fail("list_custom_values_failed", safeGhlMessage(err));
  }

  const mappings = (await ctx.store.getRequiredMappings()).filter((m) => m.required);
  const missing: string[] = [];
  const matched: { canonical: string; id: string; method: string }[] = [];
  for (const m of mappings) {
    const res = matchMapping(m, values);
    if (res.ok) matched.push({ canonical: res.match.canonical_key, id: res.match.customValueId, method: res.match.method });
    else missing.push(m.canonical_key);
  }

  if (missing.length > 0) {
    await ctx.store.setLocation(ctx.client.id, { custom_values_status: "failed" });
    const existing = await ctx.store.findOpenAdminTask(ctx.client.id, TASK_MISSING_CUSTOM_VALUE);
    if (!existing) {
      await ctx.store.createAdminTask({
        clientAccountId: ctx.client.id,
        provisioningRunId: ctx.run.id,
        taskType: TASK_MISSING_CUSTOM_VALUE,
        title: "Missing required custom values",
        instructions:
          `The following required custom values could not be matched on location ${locationId} and must be created ` +
          `before configuration can continue:\n\n- ${missing.join("\n- ")}`,
      });
    }
    return needsAction(`Missing required custom values: ${missing.join(", ")}.`, { missing });
  }

  return ok({ matched });
}

// ---------------------------------------------------------------- STEP 6
export async function updateCustomValues(ctx: StepContext): Promise<StepOutcome> {
  const loc = await ctx.store.ensureLocation(ctx.client.id);
  const locationId = loc.ghl_location_id;
  if (!locationId) return fail("no_location", "No provider location id is available.");

  await ctx.store.setLocation(ctx.client.id, { custom_values_status: "pending" });

  const token = await ensureLocationToken(ctx);
  const mappings = (await ctx.store.getRequiredMappings()).filter((m) => m.required);

  // Re-list + re-match so the step is fully self-contained (idempotent on resume).
  let values;
  try {
    values = await runTransient(ctx, () => ctx.ghl.listLocationCustomValues(locationId, token));
  } catch (err) {
    return fail("list_custom_values_failed", safeGhlMessage(err));
  }

  const perValue: Record<string, "updated" | "unchanged" | "failed" | "skipped"> = {};
  let firstFailure: { code: string; message: string } | null = null;

  for (const m of mappings) {
    const match = matchMapping(m, values);
    if (!match.ok) {
      // A required value went missing since discovery → don't guess.
      return needsAction(`Custom value became unmatched: ${m.canonical_key}.`);
    }
    const expected = expectedValueFor(m.canonical_key, ctx.client, { textImagePlaceholder: TEXT_1_IMAGE_PLACEHOLDER });
    if (expected === null) {
      perValue[m.canonical_key] = "skipped"; // do not invent a value
      continue;
    }
    if (match.match.currentValue === expected) {
      perValue[m.canonical_key] = "unchanged"; // idempotent
      continue;
    }
    try {
      await runTransient(ctx, () =>
        ctx.ghl.updateLocationCustomValue(locationId, match.match.customValueId, { value: expected }, token),
      );
      perValue[m.canonical_key] = "updated";
    } catch (err) {
      perValue[m.canonical_key] = "failed";
      if (!firstFailure) firstFailure = { code: "update_custom_value_failed", message: safeGhlMessage(err) };
    }
  }

  if (firstFailure) {
    await ctx.store.setLocation(ctx.client.id, { custom_values_status: "failed" });
    return { status: "failed", errorCode: firstFailure.code, safeMessage: firstFailure.message, metadata: { perValue } };
  }

  // Read back and compare expected vs actual.
  let after;
  try {
    after = await runTransient(ctx, () => ctx.ghl.listLocationCustomValues(locationId, token));
  } catch (err) {
    return fail("readback_failed", safeGhlMessage(err));
  }
  const mismatches: string[] = [];
  for (const m of mappings) {
    const expected = expectedValueFor(m.canonical_key, ctx.client, { textImagePlaceholder: TEXT_1_IMAGE_PLACEHOLDER });
    if (expected === null) continue;
    const match = matchMapping(m, after);
    if (!match.ok || match.match.currentValue !== expected) mismatches.push(m.canonical_key);
  }

  if (mismatches.length > 0) {
    await ctx.store.setLocation(ctx.client.id, { custom_values_status: "failed" });
    const existing = await ctx.store.findOpenAdminTask(ctx.client.id, TASK_CUSTOM_VALUE_MISMATCH);
    if (!existing) {
      await ctx.store.createAdminTask({
        clientAccountId: ctx.client.id,
        provisioningRunId: ctx.run.id,
        taskType: TASK_CUSTOM_VALUE_MISMATCH,
        title: "Custom values did not match after update",
        instructions: `These values did not read back as expected on location ${locationId}:\n\n- ${mismatches.join("\n- ")}`,
      });
    }
    return needsAction(`Custom values did not match after update: ${mismatches.join(", ")}.`, { mismatches, perValue });
  }

  await ctx.store.setLocation(ctx.client.id, { custom_values_status: "complete" });
  return ok({ perValue });
}

// ---------------------------------------------------------------- STEP 7
export async function createWebhookCredential(ctx: StepContext): Promise<StepOutcome> {
  const existing = await ctx.store.getWebhookCredential(ctx.client.id);
  if (existing && existing.enabled) return ok({ webhook: "exists", public_id: existing.publicId });

  const loc = await ctx.store.getLocation(ctx.client.id);
  const gen = ctx.makeWebhookSecret();

  try {
    await ctx.store.createWebhookCredential({
      clientAccountId: ctx.client.id,
      ghlLocationId: loc?.ghl_location_id ?? null,
      publicId: gen.publicId,
      secretHash: gen.secretHash, // only the hash is persisted
      secretCiphertext: gen.secretCiphertext, // short-lived encrypted handoff
      secretExpiresAt: gen.secretExpiresAt,
    });
  } catch (err) {
    // Never log the secret; only a generic message.
    ctx.logger.error({ event: "provisioning.webhook.create_failed", clientAccountId: ctx.client.id });
    return fail("webhook_credential_failed", err instanceof Error ? "Could not create the webhook credential." : "Could not create the webhook credential.");
  }

  const existingTask = await ctx.store.findOpenAdminTask(ctx.client.id, TASK_INSTALL_WEBHOOK);
  if (!existingTask) {
    await ctx.store.createAdminTask({
      clientAccountId: ctx.client.id,
      provisioningRunId: ctx.run.id,
      taskType: TASK_INSTALL_WEBHOOK,
      title: "Install the review webhook",
      instructions: webhookInstructions(ctx.client, gen.publicId, loc?.ghl_location_id ?? null),
    });
  }

  // Public id is fine to store in metadata; the secret is NOT.
  return ok({ webhook: "created", public_id: gen.publicId });
}

// ---------------------------------------------------------------- STEP 8
export async function runHealthChecks(ctx: StepContext): Promise<StepOutcome> {
  const c = ctx.client;
  const loc = await ctx.store.ensureLocation(c.id);
  const locationId = loc.ghl_location_id;
  const failures: string[] = [];

  if (!locationId) return needsAction("Location is not created yet.");

  // Location exists.
  try {
    await runTransient(ctx, () => ctx.ghl.getLocation(locationId));
  } catch {
    failures.push("location not reachable");
  }

  // Snapshot confirmed / manual approved.
  if (loc.snapshot_status !== "applied") failures.push("snapshot not confirmed");

  // Custom values exist + match.
  try {
    const token = await ensureLocationToken(ctx);
    const values = await runTransient(ctx, () => ctx.ghl.listLocationCustomValues(locationId, token));
    const mappings = (await ctx.store.getRequiredMappings()).filter((m) => m.required);
    for (const m of mappings) {
      const expected = expectedValueFor(m.canonical_key, c, { textImagePlaceholder: TEXT_1_IMAGE_PLACEHOLDER });
      const match = matchMapping(m, values);
      if (!match.ok) failures.push(`missing value ${m.canonical_key}`);
      else if (expected !== null && match.match.currentValue !== expected) failures.push(`value mismatch ${m.canonical_key}`);
    }
  } catch {
    failures.push("custom values not reachable");
  }

  // Webhook credential enabled.
  const cred = await ctx.store.getWebhookCredential(c.id);
  if (!cred || !cred.enabled) failures.push("webhook credential not enabled");

  // Google review link syntactically valid https.
  if (!isHttps(c.google_review_link)) failures.push("google review link invalid");

  // Logo reference exists (optional — only checked when provided).
  if (c.logo_url && !isHttps(c.logo_url)) failures.push("logo reference invalid");

  // Client sending configuration not blocked (proxy: sending domain present).
  if (!c.email_sending_domain) failures.push("sending configuration incomplete");

  if (failures.length > 0) {
    return needsAction(`Health checks need attention: ${failures.join("; ")}.`, { failures });
  }
  return ok();
}

// ---------------------------------------------------------------- STEP 9
export async function finalize(ctx: StepContext): Promise<StepOutcome> {
  await ctx.store.setLocation(ctx.client.id, { custom_values_status: "complete", last_synced_at: ctx.now().toISOString() });
  await ctx.store.setClientStatus(ctx.client.id, "active");
  return ok();
}

// ---------------------------------------------------------------- helpers
function isHttps(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function isValidTimezone(tz: string | null | undefined): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function snapshotInstructions(client: ClientAccount, locationId: string, snapshot: { id: string; name: string }): string {
  return [
    `Client: ${client.public_business_name}`,
    `Location ID: ${locationId}`,
    `Snapshot: ${snapshot.name}${snapshot.id ? ` (${snapshot.id})` : ""}`,
    "",
    "Steps (Agency View):",
    "1. Switch to Agency View.",
    "2. Open Account Snapshots.",
    `3. Push the "${snapshot.name}" snapshot to this location.`,
    "4. Wait for the push to finish.",
    "5. Return here and mark this task complete to continue provisioning.",
  ].join("\n");
}

function webhookInstructions(client: ClientAccount, publicId: string, locationId: string | null): string {
  return [
    `Client: ${client.public_business_name}`,
    locationId ? `Location ID: ${locationId}` : "",
    `Webhook identifier: ${publicId}`,
    "",
    "Install the review request webhook in the client's review workflows.",
    "The one-time webhook secret is shown only immediately after creation/rotation",
    "in the onboarding admin — copy it then. It is never stored in readable form.",
  ]
    .filter(Boolean)
    .join("\n");
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// A registry mapping step keys → implementations (used by the engine).
export const STEP_IMPLEMENTATIONS = {
  validate_submission: validateSubmission,
  create_ghl_location: createGhlLocation,
  obtain_location_token: obtainLocationToken,
  apply_snapshot: applySnapshot,
  discover_custom_values: discoverCustomValues,
  update_custom_values: updateCustomValues,
  create_webhook_credential: createWebhookCredential,
  run_health_checks: runHealthChecks,
  finalize,
} as const;
