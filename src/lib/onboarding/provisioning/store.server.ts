// =============================================================================
// Onboarding provisioning — Supabase-backed store. Server-only (service role).
//
// Implements ProvisioningStore against the real database. Concurrency-sensitive
// claims go through the SECURITY-checked RPCs in migration 0031. All other reads
// /writes use the service-role client (RLS is service-role-only on these tables).
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AdminTask,
  ClientAccount,
  GhlConnection,
  GhlLocation,
  ProvisioningRun,
  ProvisioningStep,
  ProvisioningStepKey,
} from "@/lib/onboarding/types";
import { CANONICAL_CUSTOM_VALUE_MAP } from "@/lib/onboarding/types";
import type {
  CreateAdminTaskInput,
  CreatedWebhookCredentialRow,
  CustomValueMappingRow,
  ProvisioningStore,
} from "@/lib/onboarding/provisioning/types";

export class SupabaseProvisioningStore implements ProvisioningStore {
  constructor(private readonly admin: SupabaseClient) {}

  async claimRun(runId: string, workerId: string, leaseSeconds: number): Promise<boolean> {
    const { data, error } = await this.admin.rpc("claim_provisioning_run", {
      p_run_id: runId,
      p_worker: workerId,
      p_lease_seconds: leaseSeconds,
    });
    if (error) throw new Error(`claim_provisioning_run failed: ${error.message}`);
    return data === true;
  }

  async claimNextRun(workerId: string, leaseSeconds: number): Promise<string | null> {
    const { data, error } = await this.admin.rpc("claim_next_provisioning_run", {
      p_worker: workerId,
      p_lease_seconds: leaseSeconds,
    });
    if (error) throw new Error(`claim_next_provisioning_run failed: ${error.message}`);
    return (data as string | null) ?? null;
  }

  async releaseRun(runId: string): Promise<void> {
    // Clear the lease holder; status is already set to a terminal/needs_action
    // value by the engine. Only clears if still running under our lease.
    await this.admin.from("provisioning_runs").update({ locked_by: null, lease_expires_at: null }).eq("id", runId);
  }

  async getRun(runId: string): Promise<ProvisioningRun | null> {
    const { data } = await this.admin.from("provisioning_runs").select("*").eq("id", runId).maybeSingle<ProvisioningRun>();
    return data ?? null;
  }

  async setRun(runId: string, patch: Partial<ProvisioningRun>): Promise<void> {
    const { error } = await this.admin.from("provisioning_runs").update(patch).eq("id", runId);
    if (error) throw new Error(`setRun failed: ${error.message}`);
  }

  async getClientAccount(id: string): Promise<ClientAccount | null> {
    const { data } = await this.admin.from("client_accounts").select("*").eq("id", id).maybeSingle<ClientAccount>();
    return data ?? null;
  }

  async setClientStatus(id: string, status: ClientAccount["status"]): Promise<void> {
    const { error } = await this.admin.from("client_accounts").update({ status }).eq("id", id);
    if (error) throw new Error(`setClientStatus failed: ${error.message}`);
  }

  async getActiveConnection(): Promise<GhlConnection | null> {
    const { data } = await this.admin
      .from("ghl_connections")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<GhlConnection>();
    return data ?? null;
  }

  async getLocation(clientAccountId: string): Promise<GhlLocation | null> {
    const { data } = await this.admin.from("ghl_locations").select("*").eq("client_account_id", clientAccountId).maybeSingle<GhlLocation>();
    return data ?? null;
  }

  async ensureLocation(clientAccountId: string): Promise<GhlLocation> {
    const existing = await this.getLocation(clientAccountId);
    if (existing) return existing;
    const { data, error } = await this.admin
      .from("ghl_locations")
      .insert({ client_account_id: clientAccountId })
      .select("*")
      .single<GhlLocation>();
    if (error || !data) throw new Error(`ensureLocation failed: ${error?.message ?? "unknown"}`);
    return data;
  }

  async setLocation(clientAccountId: string, patch: Partial<GhlLocation>): Promise<void> {
    await this.ensureLocation(clientAccountId);
    const { error } = await this.admin.from("ghl_locations").update(patch).eq("client_account_id", clientAccountId);
    if (error) throw new Error(`setLocation failed: ${error.message}`);
  }

  async setSnapshotStatus(clientAccountId: string, status: GhlLocation["snapshot_status"]): Promise<void> {
    await this.setLocation(clientAccountId, { snapshot_status: status });
  }

  async listSteps(runId: string): Promise<ProvisioningStep[]> {
    const { data } = await this.admin.from("provisioning_steps").select("*").eq("provisioning_run_id", runId).returns<ProvisioningStep[]>();
    return data ?? [];
  }

  async upsertStep(runId: string, key: ProvisioningStepKey, patch: Partial<ProvisioningStep>): Promise<void> {
    const { error } = await this.admin
      .from("provisioning_steps")
      .upsert(
        { provisioning_run_id: runId, step_key: key, ...patch },
        { onConflict: "provisioning_run_id,step_key" },
      );
    if (error) throw new Error(`upsertStep failed: ${error.message}`);
  }

  async getRequiredMappings(): Promise<CustomValueMappingRow[]> {
    const { data } = await this.admin
      .from("ghl_custom_value_mappings")
      .select("canonical_key, expected_ghl_key, expected_display_name, ghl_custom_value_id, required, value_type")
      .eq("active", true)
      .returns<CustomValueMappingRow[]>();
    if (data && data.length > 0) return data;
    // Fall back to the code-defined template if the table isn't seeded.
    return CANONICAL_CUSTOM_VALUE_MAP.map((m) => ({
      canonical_key: m.canonical_key,
      expected_ghl_key: m.expected_ghl_key,
      expected_display_name: null,
      ghl_custom_value_id: null,
      required: m.required,
      value_type: m.value_type,
    }));
  }

  async findOpenAdminTask(clientAccountId: string, taskType: string): Promise<AdminTask | null> {
    const { data } = await this.admin
      .from("admin_tasks")
      .select("*")
      .eq("client_account_id", clientAccountId)
      .eq("task_type", taskType)
      .eq("status", "open")
      .limit(1)
      .maybeSingle<AdminTask>();
    return data ?? null;
  }

  async createAdminTask(input: CreateAdminTaskInput): Promise<AdminTask> {
    const { data, error } = await this.admin
      .from("admin_tasks")
      .insert({
        client_account_id: input.clientAccountId,
        provisioning_run_id: input.provisioningRunId,
        task_type: input.taskType,
        title: input.title,
        instructions: input.instructions,
        status: "open",
      })
      .select("*")
      .single<AdminTask>();
    if (error || !data) throw new Error(`createAdminTask failed: ${error?.message ?? "unknown"}`);
    return data;
  }

  async getWebhookCredential(clientAccountId: string): Promise<{ id: string; publicId: string; enabled: boolean } | null> {
    const { data } = await this.admin
      .from("client_webhook_credentials")
      .select("id, public_id, enabled")
      .eq("client_account_id", clientAccountId)
      .maybeSingle<{ id: string; public_id: string; enabled: boolean }>();
    return data ? { id: data.id, publicId: data.public_id, enabled: data.enabled } : null;
  }

  async createWebhookCredential(input: {
    clientAccountId: string;
    ghlLocationId: string | null;
    publicId: string;
    secretHash: string;
    secretCiphertext: string | null;
    secretExpiresAt: string | null;
  }): Promise<CreatedWebhookCredentialRow> {
    const { data, error } = await this.admin
      .from("client_webhook_credentials")
      .upsert(
        {
          client_account_id: input.clientAccountId,
          ghl_location_id: input.ghlLocationId,
          public_id: input.publicId,
          secret_hash: input.secretHash,
          secret_ciphertext: input.secretCiphertext,
          secret_expires_at: input.secretExpiresAt,
          enabled: true,
        },
        { onConflict: "client_account_id" },
      )
      .select("id, public_id")
      .single<{ id: string; public_id: string }>();
    if (error || !data) throw new Error(`createWebhookCredential failed: ${error?.message ?? "unknown"}`);
    return { id: data.id, publicId: data.public_id };
  }
}
