import { describe, it, expect, vi } from "vitest";

import { ProvisioningEngine } from "@/lib/onboarding/provisioning/engine";
import type {
  CreateAdminTaskInput,
  CreatedWebhookCredentialRow,
  CustomValueMappingRow,
  GhlProvisioningClient,
  ProvisioningStore,
} from "@/lib/onboarding/provisioning/types";
import type {
  AdminTask,
  ClientAccount,
  GhlConnection,
  GhlLocation,
  ProvisioningRun,
  ProvisioningStep,
  ProvisioningStepKey,
} from "@/lib/onboarding/types";
import { GhlTimeoutError, GhlValidationError } from "@/lib/ghl/errors";
import type { CustomValue } from "@/lib/ghl/types";

// ---------------------------------------------------------------- fakes
const REQUIRED_MAPPINGS: CustomValueMappingRow[] = [
  { canonical_key: "google_review_link", expected_ghl_key: "google_review_link", expected_display_name: "Google Review Link", ghl_custom_value_id: null, required: true, value_type: "url" },
  { canonical_key: "logo_link", expected_ghl_key: "logo_link", expected_display_name: "Logo Link", ghl_custom_value_id: null, required: true, value_type: "image_url" },
  { canonical_key: "business_name", expected_ghl_key: "business_name", expected_display_name: "Business Name", ghl_custom_value_id: null, required: true, value_type: "string" },
  { canonical_key: "follow_up_count", expected_ghl_key: "service_type", expected_display_name: "Service Type", ghl_custom_value_id: null, required: true, value_type: "number" },
  { canonical_key: "ask_for_referral", expected_ghl_key: "ask_for_a_referral", expected_display_name: "Ask For A Referral", ghl_custom_value_id: null, required: true, value_type: "enum" },
];

function makeClient(overrides: Partial<ClientAccount> = {}): ClientAccount {
  return {
    id: "acc_1",
    onboarding_invitation_id: "inv_1",
    legal_business_name: "Acme Plumbing LLC",
    public_business_name: "Acme Plumbing",
    owner_first_name: "Dana",
    primary_email: "dana@acme.com",
    primary_phone: "+14125550100",
    website_url: "https://acme.com",
    address_line_1: "1 Main St",
    address_line_2: null,
    city: "Pittsburgh",
    state: "PA",
    postal_code: "15201",
    country: "United States",
    timezone: "America/New_York",
    google_review_link: "https://g.page/r/acme/review",
    logo_url: "https://cdn.example.com/acme/logo.png",
    primary_brand_color: null,
    email_sending_domain: "acme.com",
    follow_up_count: 2,
    review_request_limit_14_days: 8,
    current_review_requests_14_days: 0,
    ask_for_referral: true,
    status: "provisioning",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function baseCustomValues(): CustomValue[] {
  return [
    { id: "cv1", name: "Google Review Link", key: "google_review_link", value: "" },
    { id: "cv2", name: "Logo Link", key: "logo_link", value: "" },
    { id: "cv3", name: "Business Name", key: "business_name", value: "" },
    { id: "cv4", name: "Service Type", key: "service_type", value: "" },
    { id: "cv5", name: "Ask For A Referral", key: "ask_for_a_referral", value: "" },
  ];
}

class FakeStore implements ProvisioningStore {
  runs = new Map<string, ProvisioningRun>();
  clients = new Map<string, ClientAccount>();
  connection: GhlConnection | null;
  locations = new Map<string, GhlLocation>();
  steps = new Map<string, ProvisioningStep>();
  mappings: CustomValueMappingRow[] = REQUIRED_MAPPINGS;
  adminTasks: AdminTask[] = [];
  webhookCreds = new Map<string, { id: string; publicId: string; enabled: boolean }>();
  leases = new Map<string, { worker: string; expiresAt: number }>();
  now: () => Date;

  // fault injection
  failLocationIdWrites = 0;
  failWebhookCreate = false;

  constructor(opts: { connectionActive?: boolean; now?: () => Date } = {}) {
    this.now = opts.now ?? (() => new Date());
    this.connection = opts.connectionActive === false ? null : ({ id: "conn_1", ghl_company_id: "comp_1", status: "active" } as GhlConnection);
    this.clients.set("acc_1", makeClient());
    this.runs.set("run_1", {
      id: "run_1",
      client_account_id: "acc_1",
      ghl_location_id: null,
      status: "queued",
      current_step: null,
      attempt_count: 0,
      started_at: null,
      completed_at: null,
      error_code: null,
      safe_error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  async claimRun(runId: string, workerId: string): Promise<boolean> {
    const run = this.runs.get(runId);
    if (!run) return false;
    const lease = this.leases.get(runId);
    const now = this.now().getTime();
    if (lease && lease.expiresAt > now) return false; // active lease held
    this.leases.set(runId, { worker: workerId, expiresAt: now + 300_000 });
    run.status = "running";
    return true;
  }
  async claimNextRun(workerId: string): Promise<string | null> {
    for (const [id, run] of this.runs) {
      if (run.status === "queued") {
        const okc = await this.claimRun(id, workerId);
        if (okc) return id;
      }
    }
    return null;
  }
  async releaseRun(runId: string): Promise<void> {
    this.leases.delete(runId);
  }
  async getRun(runId: string) {
    return this.runs.get(runId) ?? null;
  }
  async setRun(runId: string, patch: Partial<ProvisioningRun>) {
    const cur = this.runs.get(runId);
    if (cur) this.runs.set(runId, { ...cur, ...patch });
  }
  async getClientAccount(id: string) {
    return this.clients.get(id) ?? null;
  }
  async setClientStatus(id: string, status: ClientAccount["status"]) {
    const c = this.clients.get(id);
    if (c) c.status = status;
  }
  async getActiveConnection() {
    return this.connection;
  }
  async getLocation(clientAccountId: string) {
    return this.locations.get(clientAccountId) ?? null;
  }
  async ensureLocation(clientAccountId: string) {
    let loc = this.locations.get(clientAccountId);
    if (!loc) {
      loc = {
        id: "locrow_1",
        client_account_id: clientAccountId,
        ghl_location_id: null,
        ghl_company_id: null,
        snapshot_id: null,
        snapshot_status: "not_started",
        custom_values_status: "not_started",
        provider_status: "not_started",
        last_synced_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.locations.set(clientAccountId, loc);
    }
    return loc;
  }
  async setLocation(clientAccountId: string, patch: Partial<GhlLocation>) {
    if (patch.ghl_location_id && this.failLocationIdWrites > 0) {
      this.failLocationIdWrites -= 1;
      throw new Error("simulated DB write failure");
    }
    const loc = await this.ensureLocation(clientAccountId);
    this.locations.set(clientAccountId, { ...loc, ...patch });
  }
  async setSnapshotStatus(clientAccountId: string, status: GhlLocation["snapshot_status"]) {
    await this.setLocation(clientAccountId, { snapshot_status: status });
  }
  async listSteps(runId: string) {
    return [...this.steps.values()].filter((s) => s.provisioning_run_id === runId);
  }
  async upsertStep(runId: string, key: ProvisioningStepKey, patch: Partial<ProvisioningStep>) {
    const k = `${runId}:${key}`;
    const cur = this.steps.get(k) ?? ({ id: k, provisioning_run_id: runId, step_key: key, status: "pending", attempt_count: 0, started_at: null, completed_at: null, error_code: null, safe_error_message: null, metadata: {}, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as ProvisioningStep);
    this.steps.set(k, { ...cur, ...patch });
  }
  async getRequiredMappings() {
    return this.mappings;
  }
  async findOpenAdminTask(clientAccountId: string, taskType: string) {
    return this.adminTasks.find((t) => t.client_account_id === clientAccountId && t.task_type === taskType && t.status === "open") ?? null;
  }
  async createAdminTask(input: CreateAdminTaskInput) {
    const task = {
      id: `task_${this.adminTasks.length + 1}`,
      client_account_id: input.clientAccountId,
      provisioning_run_id: input.provisioningRunId,
      task_type: input.taskType,
      title: input.title,
      instructions: input.instructions,
      status: "open",
      due_at: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as AdminTask;
    this.adminTasks.push(task);
    return task;
  }
  async getWebhookCredential(clientAccountId: string) {
    return this.webhookCreds.get(clientAccountId) ?? null;
  }
  async createWebhookCredential(input: { clientAccountId: string; publicId: string }): Promise<CreatedWebhookCredentialRow> {
    if (this.failWebhookCreate) throw new Error("simulated webhook credential failure");
    const row = { id: "cred_1", publicId: input.publicId, enabled: true };
    this.webhookCreds.set(input.clientAccountId, row);
    return { id: row.id, publicId: row.publicId };
  }
}

// Configurable mock GHL client.
function makeGhl(opts: {
  snapshotSupported?: boolean;
  customValues?: CustomValue[];
  breakReadback?: boolean;
  failUpdateFor?: string; // custom value id that fails to update (non-retryable)
  createLocationError?: Error; // thrown by createLocation every attempt
} = {}): GhlProvisioningClient & { calls: { createLocation: number; getLocation: number } } {
  const store = new Map<string, CustomValue>();
  for (const v of opts.customValues ?? baseCustomValues()) store.set(v.id, { ...v });
  const calls = { createLocation: 0, getLocation: 0 };

  const client: GhlProvisioningClient & { calls: typeof calls } = {
    calls,
    assertScopes: vi.fn(),
    createLocation: vi.fn(async (_input, idem) => {
      calls.createLocation += 1;
      if (opts.createLocationError) throw opts.createLocationError;
      if (idem?.getExistingLocationId) {
        const ex = await idem.getExistingLocationId();
        if (ex) return { locationId: ex, created: false };
      }
      return { locationId: "loc_1", created: true };
    }),
    getLocation: vi.fn(async (id: string) => {
      calls.getLocation += 1;
      return { id, name: "Acme Plumbing", companyId: "comp_1", raw: {} };
    }),
    getLocationAccessToken: vi.fn(async () => ({ accessToken: "loc-token", expiresIn: 3600 })),
    listLocationCustomValues: vi.fn(async () => [...store.values()].map((v) => ({ ...v }))),
    updateLocationCustomValue: vi.fn(async (_loc: string, cvId: string, input: { value: string }) => {
      if (opts.failUpdateFor === cvId) throw new GhlValidationError("bad value", { safeMessage: "Invalid value." });
      const cur = store.get(cvId)!;
      const next = { ...cur, value: opts.breakReadback ? cur.value : input.value };
      store.set(cvId, next);
      return next;
    }),
    listSnapshots: vi.fn(async () => []),
    snapshotAutomationSupport: vi.fn(() =>
      opts.snapshotSupported
        ? ({ supported: true, method: "apply_to_location" } as const)
        : ({ supported: false, reason: "no api", requiresManualTask: true } as const),
    ),
  };
  if (opts.snapshotSupported) {
    client.applySnapshot = vi.fn(async () => ({ statusId: "snap_status_1" }));
    client.getSnapshotStatus = vi.fn(async () => ({ status: "applied" as const }));
  }
  return client;
}

function makeEngine(store: FakeStore, ghl: GhlProvisioningClient, workerId = "w1", policyOverride?: Partial<import("@/lib/onboarding/provisioning/config").ProvisioningPolicy>) {
  return new ProvisioningEngine({
    store,
    ghl,
    workerId,
    // These tests exercise the FULL API automation path; opt in explicitly
    // (production defaults to manual custom values).
    policy: { snapshotGatesCustomValues: true, automateCustomValues: true, ...policyOverride },
    now: () => new Date("2026-07-17T00:00:00Z"),
    sleep: () => Promise.resolve(),
    makeWebhookSecret: () => ({ publicId: "whc_test", rawSecret: "raw", secretHash: "hash", secretCiphertext: "cipher", secretExpiresAt: new Date().toISOString() }),
    snapshotId: "snap_1",
    snapshotName: "Steel Scale Review System",
  });
}

// ---------------------------------------------------------------- tests
describe("ProvisioningEngine", () => {
  it("completes the fully automated path and activates the client", async () => {
    const store = new FakeStore();
    const ghl = makeGhl({ snapshotSupported: true });
    const outcome = await makeEngine(store, ghl).provision("run_1");

    expect(outcome).toEqual({ result: "complete" });
    expect(store.runs.get("run_1")!.status).toBe("complete");
    expect(store.clients.get("acc_1")!.status).toBe("active");
    // Health check ran and passed.
    expect(store.steps.get("run_1:run_health_checks")!.status).toBe("complete");
    expect(store.steps.get("run_1:finalize")!.status).toBe("complete");
    // Custom values were written to the expected values.
    const cvs = await ghl.listLocationCustomValues("loc_1", "loc-token");
    expect(cvs.find((v) => v.key === "business_name")!.value).toBe("Acme Plumbing");
    expect(cvs.find((v) => v.key === "service_type")!.value).toBe("2");
    expect(cvs.find((v) => v.key === "ask_for_a_referral")!.value).toBe("Yes");
    expect(store.locations.get("acc_1")!.custom_values_status).toBe("complete");
  });

  it("parks at needs_action with an admin task when snapshot application is unsupported", async () => {
    const store = new FakeStore();
    const ghl = makeGhl({ snapshotSupported: false });
    const outcome = await makeEngine(store, ghl).provision("run_1");

    expect(outcome).toMatchObject({ result: "needs_action", step: "apply_snapshot" });
    expect(store.runs.get("run_1")!.status).toBe("needs_action");
    expect(store.clients.get("acc_1")!.status).toBe("needs_action");
    expect(store.locations.get("acc_1")!.snapshot_status).toBe("manual_required");
    expect(store.adminTasks.find((t) => t.task_type === "load_review_snapshot")).toBeTruthy();
    // Custom values were NOT touched (gated behind the snapshot).
    expect(store.steps.has("run_1:update_custom_values")).toBe(false);
  });

  it("resumes and completes after the manual snapshot is marked applied", async () => {
    const store = new FakeStore();
    // Run 1: unsupported → needs_action.
    await makeEngine(store, makeGhl({ snapshotSupported: false })).provision("run_1");
    expect(store.runs.get("run_1")!.status).toBe("needs_action");

    // Admin marks the snapshot complete.
    store.locations.get("acc_1")!.snapshot_status = "applied";

    // Run 2: resume — skips completed steps, re-runs snapshot (now applied), finishes.
    const ghl2 = makeGhl({ snapshotSupported: false });
    const outcome = await makeEngine(store, ghl2).provision("run_1");
    expect(outcome).toEqual({ result: "complete" });
    expect(store.clients.get("acc_1")!.status).toBe("active");
    // create_ghl_location was NOT re-run (already complete).
    expect(ghl2.calls.createLocation).toBe(0);
    // A fresh location token WAS re-obtained on resume (ephemeral).
    expect(ghl2.getLocationAccessToken).toHaveBeenCalled();
  });

  it("needs_action when a required custom value cannot be matched", async () => {
    const store = new FakeStore();
    const values = baseCustomValues().filter((v) => v.key !== "business_name"); // missing
    const ghl = makeGhl({ snapshotSupported: true, customValues: values });
    const outcome = await makeEngine(store, ghl).provision("run_1");

    expect(outcome).toMatchObject({ result: "needs_action", step: "discover_custom_values" });
    expect(store.adminTasks.find((t) => t.task_type === "missing_custom_value")).toBeTruthy();
  });

  it("does not double-process a run already held under lease (duplicate worker)", async () => {
    const store = new FakeStore();
    const acquired = await store.claimRun("run_1", "other-worker");
    expect(acquired).toBe(true);

    const outcome = await makeEngine(store, makeGhl({ snapshotSupported: true }), "w2").provision("run_1");
    expect(outcome).toEqual({ result: "skipped", reason: "not_acquired" });
  });

  it("fails after bounded retries on a persistent GHL timeout", async () => {
    const store = new FakeStore();
    const ghl = makeGhl({ snapshotSupported: true, createLocationError: new GhlTimeoutError("timeout", { safeMessage: "The request to HighLevel timed out." }) });
    const outcome = await makeEngine(store, ghl).provision("run_1");

    expect(outcome).toMatchObject({ result: "failed", step: "create_ghl_location" });
    expect(store.runs.get("run_1")!.status).toBe("failed");
    expect(store.clients.get("acc_1")!.status).toBe("failed");
    expect(ghl.calls.createLocation).toBe(4); // bounded retries (maxAttempts)
  });

  it("retries only the DB write (not the API create) when location persistence fails", async () => {
    const store = new FakeStore();
    store.failLocationIdWrites = 1; // first persist of the location id fails
    const ghl = makeGhl({ snapshotSupported: true });
    const outcome = await makeEngine(store, ghl).provision("run_1");

    expect(outcome).toEqual({ result: "complete" });
    expect(ghl.calls.createLocation).toBe(1); // NEVER created a second location
    expect(store.locations.get("acc_1")!.ghl_location_id).toBe("loc_1");
  });

  it("fails the step and records partial success on a custom-value update failure", async () => {
    const store = new FakeStore();
    const ghl = makeGhl({ snapshotSupported: true, failUpdateFor: "cv2" }); // logo_link update fails
    const outcome = await makeEngine(store, ghl).provision("run_1");

    expect(outcome).toMatchObject({ result: "failed", step: "update_custom_values" });
    const meta = store.steps.get("run_1:update_custom_values")!.metadata as { perValue: Record<string, string> };
    expect(meta.perValue.logo_link).toBe("failed");
    expect(meta.perValue.business_name).toBe("updated"); // others still applied
    expect(store.locations.get("acc_1")!.custom_values_status).toBe("failed");
  });

  it("needs_action on a custom-value readback mismatch", async () => {
    const store = new FakeStore();
    const ghl = makeGhl({ snapshotSupported: true, breakReadback: true }); // updates don't stick
    const outcome = await makeEngine(store, ghl).provision("run_1");

    expect(outcome).toMatchObject({ result: "needs_action", step: "update_custom_values" });
    expect(store.adminTasks.find((t) => t.task_type === "custom_value_mismatch")).toBeTruthy();
  });

  it("fails when the webhook credential cannot be created (no secret leaked)", async () => {
    const store = new FakeStore();
    store.failWebhookCreate = true;
    const errorSpy = vi.fn();
    const engine = new ProvisioningEngine({
      store,
      ghl: makeGhl({ snapshotSupported: true }),
      workerId: "w1",
      policy: { snapshotGatesCustomValues: true, automateCustomValues: true },
      now: () => new Date("2026-07-17T00:00:00Z"),
      sleep: () => Promise.resolve(),
      makeWebhookSecret: () => ({ publicId: "whc_test", rawSecret: "raw-secret", secretHash: "h", secretCiphertext: "c", secretExpiresAt: new Date().toISOString() }),
      snapshotId: "snap_1",
      snapshotName: "Steel Scale Review System",
      logger: { info: () => {}, warn: () => {}, error: errorSpy },
    });
    const outcome = await engine.provision("run_1");

    expect(outcome).toMatchObject({ result: "failed", step: "create_webhook_credential" });
    // The error log must not contain the raw secret.
    for (const call of errorSpy.mock.calls) {
      expect(JSON.stringify(call)).not.toContain("raw-secret");
    }
  });

  it("fails validation without retrying when there is no active connection", async () => {
    const store = new FakeStore({ connectionActive: false });
    const ghl = makeGhl({ snapshotSupported: true });
    const outcome = await makeEngine(store, ghl).provision("run_1");

    expect(outcome).toMatchObject({ result: "failed", step: "validate_submission", errorCode: "no_active_connection" });
    expect(ghl.calls.createLocation).toBe(0); // never reached the GHL calls
  });

  // ---- manual custom-values mode (the production default) ----
  it("manual custom values: parks with a set_custom_values task and skips the token + update steps", async () => {
    const store = new FakeStore();
    const ghl = makeGhl({ snapshotSupported: true });
    const outcome = await makeEngine(store, ghl, "w1", { automateCustomValues: false }).provision("run_1");

    expect(outcome).toMatchObject({ result: "needs_action", step: "discover_custom_values" });
    expect(store.clients.get("acc_1")!.status).toBe("needs_action");
    expect(store.adminTasks.find((t) => t.task_type === "set_custom_values")).toBeTruthy();
    // No location token was minted; the update step was never reached.
    expect(store.steps.get("run_1:obtain_location_token")!.status).toBe("skipped");
    expect(ghl.getLocationAccessToken).not.toHaveBeenCalled();
    expect(store.steps.has("run_1:update_custom_values")).toBe(false);
  });

  it("manual custom values: resumes to complete + active after the values are marked done", async () => {
    const store = new FakeStore();
    const ghl = makeGhl({ snapshotSupported: true });
    await makeEngine(store, ghl, "w1", { automateCustomValues: false }).provision("run_1");

    // Operator enters the values in GHL by hand and marks the task complete.
    await store.setLocation("acc_1", { custom_values_status: "complete" });

    const outcome = await makeEngine(store, ghl, "w2", { automateCustomValues: false }).provision("run_1");
    expect(outcome).toEqual({ result: "complete" });
    expect(store.clients.get("acc_1")!.status).toBe("active");
    expect(store.steps.get("run_1:update_custom_values")!.status).toBe("skipped");
    // The whole flow never touched the custom-value API.
    expect(ghl.getLocationAccessToken).not.toHaveBeenCalled();
  });
});
