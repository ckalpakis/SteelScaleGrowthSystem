// =============================================================================
// Onboarding admin operations. Server-only (service-role). Every mutating
// operation records an audit entry. Secrets/tokens are never returned or logged;
// a rotated raw secret is returned ONCE to the caller for immediate display.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

import { createInvitation, revokeInvitation } from "@/lib/onboarding/invitations";
import { INVITATION_TTL_DAYS } from "@/lib/onboarding/config";
import { createProvisioningEngine } from "@/lib/onboarding/provisioning/factory.server";
import { SupabaseProvisioningStore } from "@/lib/onboarding/provisioning/store.server";
import { generateWebhookCredential } from "@/lib/onboarding/provisioning/webhook";
import type {
  AdminTask,
  ClientAccount,
  GhlLocation,
  InvitationStatus,
  OnboardingInvitation,
  ProvisioningRun,
  ProvisioningStep,
} from "@/lib/onboarding/types";

// ---------------------------------------------------------------- audit
export async function recordAudit(
  admin: SupabaseClient,
  actorEmail: string,
  action: string,
  targetType: string,
  targetId: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await admin.from("admin_audit_log").insert({ actor_email: actorEmail, action, target_type: targetType, target_id: targetId, metadata });
}

// ---------------------------------------------------------------- overview
export interface OverviewCounts {
  pendingInvitations: number;
  submitted: number;
  provisioning: number;
  needsAction: number;
  active: number;
  failed: number;
}

export async function getOnboardingOverview(admin: SupabaseClient): Promise<OverviewCounts> {
  const [inv, clients] = await Promise.all([
    admin.from("onboarding_invitations").select("status").returns<{ status: InvitationStatus }[]>(),
    admin.from("client_accounts").select("status").returns<{ status: ClientAccount["status"] }[]>(),
  ]);
  const invRows = inv.data ?? [];
  const clientRows = clients.data ?? [];
  const count = <T extends { status: string }>(rows: T[], s: string) => rows.filter((r) => r.status === s).length;
  return {
    pendingInvitations: invRows.filter((r) => r.status === "pending" || r.status === "opened").length,
    submitted: count(invRows, "submitted"),
    provisioning: count(clientRows, "provisioning"),
    needsAction: count(clientRows, "needs_action"),
    active: count(clientRows, "active"),
    failed: count(clientRows, "failed"),
  };
}

// ---------------------------------------------------------------- detail
export interface ClientDetail {
  client: ClientAccount;
  location: GhlLocation | null;
  run: ProvisioningRun | null;
  steps: ProvisioningStep[];
  tasks: AdminTask[];
  webhook: { publicId: string; enabled: boolean } | null;
}

export async function getClientDetail(admin: SupabaseClient, clientAccountId: string): Promise<ClientDetail | null> {
  const { data: client } = await admin.from("client_accounts").select("*").eq("id", clientAccountId).maybeSingle<ClientAccount>();
  if (!client) return null; // scoped strictly by id — no cross-account leakage

  const store = new SupabaseProvisioningStore(admin);
  const [location, runRes, tasksRes, cred] = await Promise.all([
    store.getLocation(clientAccountId),
    admin.from("provisioning_runs").select("*").eq("client_account_id", clientAccountId).order("created_at", { ascending: false }).limit(1).maybeSingle<ProvisioningRun>(),
    admin.from("admin_tasks").select("*").eq("client_account_id", clientAccountId).order("created_at", { ascending: false }).returns<AdminTask[]>(),
    store.getWebhookCredential(clientAccountId),
  ]);

  const run = runRes.data ?? null;
  const steps = run ? await store.listSteps(run.id) : [];

  return {
    client,
    location,
    run,
    steps,
    tasks: tasksRes.data ?? [],
    webhook: cred ? { publicId: cred.publicId, enabled: cred.enabled } : null,
  };
}

// ---------------------------------------------------------------- provisioning
export async function retryProvisioning(admin: SupabaseClient, runId: string, actorEmail: string): Promise<{ ok: boolean; message: string }> {
  await recordAudit(admin, actorEmail, "provisioning.retry", "provisioning_run", runId);
  try {
    const engine = createProvisioningEngine(admin, { workerId: `admin:${actorEmail}` });
    const outcome = await engine.provision(runId);
    return { ok: outcome.result !== "failed", message: `Provisioning ${outcome.result}.` };
  } catch {
    return { ok: false, message: "Could not run provisioning. Check the provider configuration." };
  }
}

export async function rerunCustomValueSync(admin: SupabaseClient, runId: string, actorEmail: string): Promise<{ ok: boolean; message: string }> {
  await recordAudit(admin, actorEmail, "provisioning.rerun_custom_values", "provisioning_run", runId);
  // Reset the value-sync + downstream steps so the engine re-runs them.
  for (const key of ["discover_custom_values", "update_custom_values", "run_health_checks", "finalize"]) {
    await admin.from("provisioning_steps").update({ status: "pending", error_code: null, safe_error_message: null }).eq("provisioning_run_id", runId).eq("step_key", key);
  }
  const { data: run } = await admin.from("provisioning_runs").select("client_account_id").eq("id", runId).maybeSingle<{ client_account_id: string }>();
  if (run) await admin.from("ghl_locations").update({ custom_values_status: "pending" }).eq("client_account_id", run.client_account_id);
  return retryProvisioning(admin, runId, actorEmail);
}

// ---------------------------------------------------------------- admin tasks
export async function setAdminTaskStatus(admin: SupabaseClient, taskId: string, status: "complete" | "dismissed", actorEmail: string): Promise<void> {
  await admin.from("admin_tasks").update({ status, completed_at: status === "complete" ? new Date().toISOString() : null }).eq("id", taskId);
  await recordAudit(admin, actorEmail, `admin_task.${status}`, "admin_task", taskId);
}

export async function markSnapshotTaskComplete(admin: SupabaseClient, taskId: string, actorEmail: string): Promise<{ ok: boolean; message: string }> {
  const { data: task } = await admin.from("admin_tasks").select("*").eq("id", taskId).maybeSingle<AdminTask>();
  if (!task) return { ok: false, message: "Task not found." };

  await admin.from("ghl_locations").update({ snapshot_status: "applied" }).eq("client_account_id", task.client_account_id);
  await admin.from("admin_tasks").update({ status: "complete", completed_at: new Date().toISOString() }).eq("id", taskId);
  await recordAudit(admin, actorEmail, "snapshot.mark_complete", "admin_task", taskId, { clientAccountId: task.client_account_id });

  // Resume provisioning from where it parked.
  const runId = task.provisioning_run_id;
  if (runId) return retryProvisioning(admin, runId, actorEmail);
  return { ok: true, message: "Snapshot marked complete." };
}

// Manual location mode: the operator created the sub-account in GHL and is
// entering its Location ID. Record it, complete the task, and resume provisioning.
export async function setClientLocationId(admin: SupabaseClient, clientAccountId: string, rawLocationId: string, actorEmail: string): Promise<{ ok: boolean; message: string }> {
  const locationId = rawLocationId.trim();
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(locationId)) {
    return { ok: false, message: "That doesn't look like a valid GHL Location ID." };
  }

  // Ensure a location row exists, then record the id (unique per client).
  await admin.from("ghl_locations").upsert({ client_account_id: clientAccountId, ghl_location_id: locationId }, { onConflict: "client_account_id" });
  await admin.from("admin_tasks").update({ status: "complete", completed_at: new Date().toISOString() })
    .eq("client_account_id", clientAccountId).eq("task_type", "enter_location_id").eq("status", "open");
  await recordAudit(admin, actorEmail, "location.set_id", "client_account", clientAccountId, { ghlLocationId: locationId });

  const { data: run } = await admin.from("provisioning_runs").select("id").eq("client_account_id", clientAccountId).order("created_at", { ascending: false }).limit(1).maybeSingle<{ id: string }>();
  if (run) return retryProvisioning(admin, run.id, actorEmail);
  return { ok: true, message: "Location ID saved." };
}

// Manual custom-values mode: the operator entered the values by hand in GHL and
// is attesting completion. Mark the location's custom values complete and resume.
export async function markCustomValuesTaskComplete(admin: SupabaseClient, taskId: string, actorEmail: string): Promise<{ ok: boolean; message: string }> {
  const { data: task } = await admin.from("admin_tasks").select("*").eq("id", taskId).maybeSingle<AdminTask>();
  if (!task) return { ok: false, message: "Task not found." };

  await admin.from("ghl_locations").update({ custom_values_status: "complete" }).eq("client_account_id", task.client_account_id);
  await admin.from("admin_tasks").update({ status: "complete", completed_at: new Date().toISOString() }).eq("id", taskId);
  await recordAudit(admin, actorEmail, "custom_values.mark_complete", "admin_task", taskId, { clientAccountId: task.client_account_id });

  const runId = task.provisioning_run_id;
  if (runId) return retryProvisioning(admin, runId, actorEmail);
  return { ok: true, message: "Custom values marked complete." };
}

// ---------------------------------------------------------------- webhook secret
export async function rotateWebhookSecret(admin: SupabaseClient, clientAccountId: string, actorEmail: string): Promise<{ rawSecret: string; publicId: string } | null> {
  const { data: client } = await admin.from("client_accounts").select("id").eq("id", clientAccountId).maybeSingle<{ id: string }>();
  if (!client) return null;

  const { data: loc } = await admin.from("ghl_locations").select("ghl_location_id").eq("client_account_id", clientAccountId).maybeSingle<{ ghl_location_id: string | null }>();
  const gen = generateWebhookCredential();
  const store = new SupabaseProvisioningStore(admin);
  const created = await store.createWebhookCredential({
    clientAccountId,
    ghlLocationId: loc?.ghl_location_id ?? null,
    publicId: gen.publicId,
    secretHash: gen.secretHash,
    secretCiphertext: gen.secretCiphertext,
    secretExpiresAt: gen.secretExpiresAt,
  });
  await recordAudit(admin, actorEmail, "webhook.rotate_secret", "client_account", clientAccountId, { publicId: created.publicId });
  // Returned ONCE for immediate display; never persisted in readable form.
  return { rawSecret: gen.rawSecret, publicId: created.publicId };
}

// ---------------------------------------------------------------- client status
export async function pauseClient(admin: SupabaseClient, clientAccountId: string, actorEmail: string): Promise<void> {
  await admin.from("client_accounts").update({ status: "paused" }).eq("id", clientAccountId);
  await recordAudit(admin, actorEmail, "client.pause", "client_account", clientAccountId);
}

// Editable subset of client configuration (admin correction).
export interface ClientConfigPatch {
  public_business_name?: string;
  legal_business_name?: string;
  owner_first_name?: string;
  primary_email?: string;
  website_url?: string;
  google_review_link?: string;
  review_request_limit_14_days?: number;
  follow_up_count?: number;
  ask_for_referral?: boolean;
}

export async function editClientConfig(admin: SupabaseClient, clientAccountId: string, patch: ClientConfigPatch, actorEmail: string): Promise<{ ok: boolean; message: string }> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined && v !== "") clean[k] = v;
  }
  if (Object.keys(clean).length === 0) return { ok: false, message: "Nothing to update." };
  const { error } = await admin.from("client_accounts").update(clean).eq("id", clientAccountId);
  if (error) return { ok: false, message: "Could not save changes." };
  await recordAudit(admin, actorEmail, "client.edit_config", "client_account", clientAccountId, { fields: Object.keys(clean) });
  return { ok: true, message: "Changes saved." };
}

// ---------------------------------------------------------------- invitations
/** Business rule: an invitation may be resent unless it was already submitted. */
export function canResendInvitation(status: InvitationStatus): boolean {
  return status !== "submitted";
}

export async function resendInvitation(
  admin: SupabaseClient,
  invitationId: string,
  actorEmail: string,
  createdByUserId: string,
): Promise<{ ok: boolean; link?: string; message: string }> {
  const { data: inv } = await admin.from("onboarding_invitations").select("*").eq("id", invitationId).maybeSingle<OnboardingInvitation>();
  if (!inv) return { ok: false, message: "Invitation not found." };
  if (!canResendInvitation(inv.status)) return { ok: false, message: "This invitation was already completed and cannot be resent." };

  // Revoke the old link, mint a brand-new one (new token) for the same email.
  await revokeInvitation(admin, invitationId).catch(() => undefined);
  const { rawToken } = await createInvitation(admin, {
    clientEmail: inv.client_email,
    createdByUserId,
    ttlDays: INVITATION_TTL_DAYS,
  });
  await recordAudit(admin, actorEmail, "invitation.resend", "onboarding_invitation", invitationId);
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return { ok: true, link: `${base}/onboard/${rawToken}`, message: "A new link was generated." };
}
