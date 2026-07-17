// =============================================================================
// Onboarding provisioning — engine (state machine + resume + lease). Server-only.
//
// State machine:   queued → running → complete
//                                    ↘ needs_action  (manual work required)
//                                    ↘ failed        (terminal error)
//
// The engine claims a run (lease → prevents concurrent workers on the same
// client), runs the ordered steps resuming from the first incomplete one,
// persists each step's status, and maps the first blocking outcome to the run's
// terminal state. Bounded retries live inside steps; the engine never retries a
// validation/config failure. Raw errors never reach the client — only safe
// messages are stored.
// =============================================================================

import type { ProvisioningStepKey } from "@/lib/onboarding/types";
import { STEP_ORDER, type GhlProvisioningClient, type ProvisioningStore, type RunOutcome } from "@/lib/onboarding/provisioning/types";
import { STEP_IMPLEMENTATIONS, type Logger, type StepContext } from "@/lib/onboarding/provisioning/steps";
import { DEFAULT_POLICY, PROVISIONING_LEASE_SECONDS, REVIEW_SNAPSHOT_ID, REVIEW_SNAPSHOT_NAME, type ProvisioningPolicy } from "@/lib/onboarding/provisioning/config";
import { generateWebhookCredential, type GeneratedWebhookSecret } from "@/lib/onboarding/provisioning/webhook";

export interface EngineDeps {
  store: ProvisioningStore;
  ghl: GhlProvisioningClient;
  workerId?: string;
  policy?: ProvisioningPolicy;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  logger?: Logger;
  leaseSeconds?: number;
  makeWebhookSecret?: () => GeneratedWebhookSecret;
  snapshotId?: string;
  snapshotName?: string;
}

const noopLogger: Logger = { info: () => {}, warn: () => {}, error: () => {} };

export class ProvisioningEngine {
  private readonly store: ProvisioningStore;
  private readonly ghl: GhlProvisioningClient;
  private readonly workerId: string;
  private readonly policy: ProvisioningPolicy;
  private readonly now: () => Date;
  private readonly sleep?: (ms: number) => Promise<void>;
  private readonly logger: Logger;
  private readonly leaseSeconds: number;
  private readonly makeWebhookSecret: () => GeneratedWebhookSecret;
  private readonly snapshot: { id: string; name: string };

  constructor(deps: EngineDeps) {
    this.store = deps.store;
    this.ghl = deps.ghl;
    this.workerId = deps.workerId ?? `worker-${Math.random().toString(36).slice(2, 10)}`;
    this.policy = deps.policy ?? DEFAULT_POLICY;
    this.now = deps.now ?? (() => new Date());
    this.sleep = deps.sleep;
    this.logger = deps.logger ?? noopLogger;
    this.leaseSeconds = deps.leaseSeconds ?? PROVISIONING_LEASE_SECONDS;
    this.makeWebhookSecret = deps.makeWebhookSecret ?? generateWebhookCredential;
    this.snapshot = { id: deps.snapshotId ?? REVIEW_SNAPSHOT_ID, name: deps.snapshotName ?? REVIEW_SNAPSHOT_NAME };
  }

  /** Claim a specific run (admin retry / direct) and process it. */
  async provision(runId: string): Promise<RunOutcome> {
    const acquired = await this.store.claimRun(runId, this.workerId, this.leaseSeconds);
    if (!acquired) return { result: "skipped", reason: "not_acquired" };
    return this.runClaimed(runId);
  }

  /** Claim + process the next drainable run, or return null if none. */
  async provisionNext(): Promise<{ runId: string; outcome: RunOutcome } | null> {
    const runId = await this.store.claimNextRun(this.workerId, this.leaseSeconds);
    if (!runId) return null;
    const outcome = await this.runClaimed(runId);
    return { runId, outcome };
  }

  /** Process an already-leased run. Always releases the lease at the end. */
  async runClaimed(runId: string): Promise<RunOutcome> {
    try {
      const run = await this.store.getRun(runId);
      if (!run) return { result: "failed", step: "validate_submission", errorCode: "run_missing", safeMessage: "Run not found." };

      const client = await this.store.getClientAccount(run.client_account_id);
      if (!client) {
        await this.store.setRun(runId, { status: "failed", error_code: "client_missing", safe_error_message: "Client account not found." });
        return { result: "failed", step: "validate_submission", errorCode: "client_missing", safeMessage: "Client account not found." };
      }

      const connection = await this.store.getActiveConnection();
      await this.store.setClientStatus(client.id, "provisioning");

      const steps = await this.store.listSteps(runId);
      const stepMap = new Map(steps.map((s) => [s.step_key, s]));

      const ctx: StepContext = {
        run,
        client,
        // A missing/inactive connection is validated in step 1; pass a safe shell.
        connection: connection ?? ({ status: "inactive" } as StepContext["connection"]),
        store: this.store,
        ghl: this.ghl,
        policy: this.policy,
        now: this.now,
        logger: this.logger,
        sleep: this.sleep,
        makeWebhookSecret: this.makeWebhookSecret,
        snapshot: this.snapshot,
        state: {},
      };

      for (const key of STEP_ORDER) {
        const existing = stepMap.get(key);
        if (existing && (existing.status === "complete" || existing.status === "skipped")) continue;

        await this.store.setRun(runId, { current_step: key });
        await this.store.upsertStep(runId, key, {
          status: "running",
          started_at: this.now().toISOString(),
          attempt_count: (existing?.attempt_count ?? 0) + 1,
          error_code: null,
          safe_error_message: null,
        });

        const impl = STEP_IMPLEMENTATIONS[key];
        const outcome = await impl(ctx);

        await this.store.upsertStep(runId, key, {
          status: outcome.status,
          completed_at: outcome.status === "complete" || outcome.status === "skipped" ? this.now().toISOString() : null,
          error_code: outcome.errorCode ?? null,
          safe_error_message: outcome.safeMessage ?? null,
          metadata: outcome.metadata ?? {},
        });

        if (outcome.status === "failed") {
          await this.markFailed(runId, client.id, key, outcome.errorCode ?? "failed", outcome.safeMessage ?? "Provisioning failed.");
          return { result: "failed", step: key, errorCode: outcome.errorCode ?? "failed", safeMessage: outcome.safeMessage ?? "Provisioning failed." };
        }

        if (outcome.status === "manual_required" && (outcome.gate ?? true)) {
          await this.markNeedsAction(runId, client.id, key, outcome.safeMessage ?? "Manual action required.");
          return { result: "needs_action", step: key, safeMessage: outcome.safeMessage ?? "Manual action required." };
        }
        // Non-gating manual_required: continue to the next step.
      }

      // Every step completed (finalize already set client active).
      await this.store.setRun(runId, {
        status: "complete",
        current_step: "finalize",
        completed_at: this.now().toISOString(),
        error_code: null,
        safe_error_message: null,
      });
      return { result: "complete" };
    } catch (err) {
      // Unexpected engine error — record a safe message, never the raw stack.
      this.logger.error({ event: "provisioning.engine.error", runId });
      await this.store.setRun(runId, { status: "failed", error_code: "engine_error", safe_error_message: "An unexpected error occurred during provisioning." });
      return { result: "failed", step: "finalize", errorCode: "engine_error", safeMessage: "An unexpected error occurred during provisioning." };
    } finally {
      await this.store.releaseRun(runId);
    }
  }

  private async markFailed(runId: string, clientId: string, step: ProvisioningStepKey, code: string, message: string): Promise<void> {
    await this.store.setRun(runId, { status: "failed", current_step: step, error_code: code, safe_error_message: message, completed_at: this.now().toISOString() });
    await this.store.setClientStatus(clientId, "failed");
  }

  private async markNeedsAction(runId: string, clientId: string, step: ProvisioningStepKey, message: string): Promise<void> {
    await this.store.setRun(runId, { status: "needs_action", current_step: step, safe_error_message: message });
    await this.store.setClientStatus(clientId, "needs_action");
  }
}
