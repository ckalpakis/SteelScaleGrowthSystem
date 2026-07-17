"use server";

import { revalidatePath } from "next/cache";

import { requireAgencyAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createInvitation, revokeInvitation } from "@/lib/onboarding/invitations";
import {
  editClientConfig,
  getClientDetail,
  markCustomValuesTaskComplete,
  markSnapshotTaskComplete,
  pauseClient,
  recordAudit,
  rerunCustomValueSync,
  resendInvitation,
  retryProvisioning,
  rotateWebhookSecret,
  setAdminTaskStatus,
  type ClientConfigPatch,
} from "@/lib/onboarding/admin.server";
import { buildTestChecklist, isTwilioConfigured, type ChecklistItem } from "@/lib/onboarding/test-config";
import { hashWebhookSecret } from "@/lib/onboarding/provisioning/webhook";
import { buildReviewMessage } from "@/lib/review/messageBuilder";
import { sendMessage } from "@/lib/review/services/twilioService";
import { normalizePhoneToE164 } from "@/lib/onboarding/validation";

export type CreateInvitationState =
  | { ok: true; link: string; email: string | null }
  | { ok: false; error: string }
  | { ok: null };

// Create an invitation and return the raw link ONCE (never stored, never
// retrievable again). Admin-only.
export async function createInvitationAction(
  _prev: CreateInvitationState,
  formData: FormData,
): Promise<CreateInvitationState> {
  const { userId, email } = await requireAgencyAdmin();

  const rawEmail = String(formData.get("client_email") ?? "").trim();
  if (rawEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    return { ok: false, error: "Enter a valid email address, or leave it blank." };
  }

  try {
    const admin = createAdminClient();
    const { rawToken } = await createInvitation(admin, {
      clientEmail: rawEmail || null,
      createdByUserId: userId,
    });

    const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const link = `${base}/onboard/${rawToken}`;
    await recordAudit(admin, email, "invitation.create", "onboarding_invitation", null, { email: rawEmail || null });

    revalidatePath("/dashboard/onboarding/invitations");
    return { ok: true, link, email: rawEmail || null };
  } catch (err) {
    console.error("[onboarding] create invitation failed", err);
    return { ok: false, error: "Could not create the invitation. Please try again." };
  }
}

export async function revokeInvitationAction(invitationId: string): Promise<void> {
  const { email } = await requireAgencyAdmin();
  const admin = createAdminClient();
  await revokeInvitation(admin, invitationId);
  await recordAudit(admin, email, "invitation.revoke", "onboarding_invitation", invitationId);
  revalidatePath("/dashboard/onboarding/invitations");
}

// Resend: generate a brand-new link (new token) for the same email, if allowed.
export async function resendInvitationLinkAction(invitationId: string): Promise<{ ok: boolean; link?: string; message: string }> {
  const { userId, email } = await requireAgencyAdmin();
  const admin = createAdminClient();
  const res = await resendInvitation(admin, invitationId, email, userId);
  revalidatePath("/dashboard/onboarding/invitations");
  return res;
}

export async function retryProvisioningAction(runId: string): Promise<{ ok: boolean; message: string }> {
  const { email } = await requireAgencyAdmin();
  const res = await retryProvisioning(createAdminClient(), runId, email);
  revalidatePath("/dashboard/onboarding");
  return res;
}

export async function rerunCustomValueSyncAction(runId: string): Promise<{ ok: boolean; message: string }> {
  const { email } = await requireAgencyAdmin();
  const res = await rerunCustomValueSync(createAdminClient(), runId, email);
  revalidatePath("/dashboard/onboarding");
  return res;
}

export async function markSnapshotTaskCompleteAction(taskId: string): Promise<{ ok: boolean; message: string }> {
  const { email } = await requireAgencyAdmin();
  const res = await markSnapshotTaskComplete(createAdminClient(), taskId, email);
  revalidatePath("/dashboard/onboarding");
  return res;
}

export async function markCustomValuesTaskCompleteAction(taskId: string): Promise<{ ok: boolean; message: string }> {
  const { email } = await requireAgencyAdmin();
  const res = await markCustomValuesTaskComplete(createAdminClient(), taskId, email);
  revalidatePath("/dashboard/onboarding");
  return res;
}

export async function completeAdminTaskAction(taskId: string, status: "complete" | "dismissed"): Promise<void> {
  const { email } = await requireAgencyAdmin();
  await setAdminTaskStatus(createAdminClient(), taskId, status, email);
  revalidatePath("/dashboard/onboarding");
}

export async function pauseClientAction(clientAccountId: string): Promise<void> {
  const { email } = await requireAgencyAdmin();
  await pauseClient(createAdminClient(), clientAccountId, email);
  revalidatePath("/dashboard/onboarding");
}

export async function editClientConfigAction(clientAccountId: string, patch: ClientConfigPatch): Promise<{ ok: boolean; message: string }> {
  const { email } = await requireAgencyAdmin();
  const res = await editClientConfig(createAdminClient(), clientAccountId, patch, email);
  revalidatePath(`/dashboard/onboarding/clients/${clientAccountId}`);
  return res;
}

// Rotate the webhook secret and return the raw value ONCE for immediate display.
export async function regenerateWebhookSecretAction(clientAccountId: string): Promise<{ ok: boolean; rawSecret?: string; publicId?: string; message: string }> {
  const { email } = await requireAgencyAdmin();
  const res = await rotateWebhookSecret(createAdminClient(), clientAccountId, email);
  revalidatePath(`/dashboard/onboarding/clients/${clientAccountId}/webhook`);
  if (!res) return { ok: false, message: "Client not found." };
  return { ok: true, rawSecret: res.rawSecret, publicId: res.publicId, message: "New secret generated. Copy it now — it won't be shown again." };
}

// Dry-run configuration test — never sends an SMS. Optionally verifies a secret.
export async function testConfigurationAction(clientAccountId: string, providedSecret?: string): Promise<{ items: ChecklistItem[]; passed: boolean }> {
  await requireAgencyAdmin();
  const admin = createAdminClient();
  const detail = await getClientDetail(admin, clientAccountId);
  if (!detail) return { items: [], passed: false };

  let secretMatches = false;
  const secretProvided = Boolean(providedSecret);
  if (providedSecret) {
    const { data } = await admin.from("client_webhook_credentials").select("secret_hash").eq("client_account_id", clientAccountId).maybeSingle<{ secret_hash: string }>();
    secretMatches = Boolean(data && data.secret_hash === hashWebhookSecret(providedSecret));
  }

  return buildTestChecklist({
    credentialEnabled: Boolean(detail.webhook?.enabled),
    secretProvided,
    secretMatches,
    locationId: detail.location?.ghl_location_id ?? null,
    clientActive: detail.client.status === "active",
    hasReviewLink: Boolean(detail.client.google_review_link),
    twilioConfigured: isTwilioConfigured(),
  });
}

// Explicit admin-only real test send to an admin-supplied, opted-in number.
export async function sendRealTestSmsAction(clientAccountId: string, toNumber: string, confirmed: boolean): Promise<{ ok: boolean; message: string }> {
  const { email } = await requireAgencyAdmin();
  if (!confirmed) return { ok: false, message: "Please confirm the number is opted in." };
  if (!isTwilioConfigured()) return { ok: false, message: "Messaging is not configured." };

  const to = normalizePhoneToE164(toNumber);
  if (!to) return { ok: false, message: "Enter a valid phone number." };

  const admin = createAdminClient();
  const detail = await getClientDetail(admin, clientAccountId);
  if (!detail) return { ok: false, message: "Client not found." };
  if (!detail.client.google_review_link) return { ok: false, message: "This client has no review link configured." };

  try {
    await sendMessage({
      to,
      body: buildReviewMessage({ firstName: "there", businessName: detail.client.public_business_name, reviewLink: detail.client.google_review_link }),
    });
    await recordAudit(admin, email, "webhook.real_test_sms", "client_account", clientAccountId, { to });
    return { ok: true, message: `Test message sent to ${to}.` };
  } catch {
    return { ok: false, message: "Could not send the test message." };
  }
}
