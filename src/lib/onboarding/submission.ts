// =============================================================================
// Client onboarding — submission service. Server-only (service-role client).
//
// Validates the client's submitted setup, then commits it atomically via the
// submit_onboarding() RPC (migration 0030): create client_account, mark the
// invitation submitted, and enqueue a durable provisioning_run. No GHL/Twilio
// calls happen here — provisioning is drained by a background worker. Every
// failure is mapped to a SAFE, generic outcome; raw errors never leave here.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

import { hashInvitationToken } from "@/lib/onboarding/tokens";
import { validateOnboardingSubmission, type ValidationIssue } from "@/lib/onboarding/validation";

export type SubmissionFailureCode =
  | "invalid_link" // not found / revoked / expired / already submitted — surfaced generically
  | "validation" // the submitted fields didn't pass validation
  | "error"; // unexpected server error

export type SubmissionResult =
  | { ok: true; clientAccountId: string; provisioningRunId: string }
  | { ok: false; code: SubmissionFailureCode; issues?: ValidationIssue[] };

/** Map a Postgres RAISE message from submit_onboarding() to a generic outcome. */
function mapRpcError(message: string | undefined): SubmissionResult {
  const m = message ?? "";
  // All invitation-state failures collapse to the same client-facing message so
  // a guesser can't distinguish "expired" from "never existed".
  if (
    m.includes("ONBOARD_INVALID") ||
    m.includes("ONBOARD_REVOKED") ||
    m.includes("ONBOARD_EXPIRED") ||
    m.includes("ONBOARD_SUBMITTED")
  ) {
    return { ok: false, code: "invalid_link" };
  }
  return { ok: false, code: "error" };
}

/**
 * Validate + atomically commit an onboarding submission.
 *
 * @param rawToken   the raw invitation token from the URL/body
 * @param rawPayload the client-supplied fields (logo already uploaded → logo_url)
 */
export async function submitOnboarding(
  admin: SupabaseClient,
  rawToken: string,
  rawPayload: unknown,
): Promise<SubmissionResult> {
  const validation = validateOnboardingSubmission(rawPayload);
  if (!validation.ok) {
    return { ok: false, code: "validation", issues: validation.issues };
  }

  const d = validation.data;
  const payload = {
    legal_business_name: d.legal_business_name,
    public_business_name: d.public_business_name,
    owner_first_name: d.owner_first_name,
    primary_email: d.primary_email,
    primary_phone: d.primary_phone_e164,
    website_url: d.website_url,
    address_line_1: d.address_line_1 ?? "",
    address_line_2: d.address_line_2 ?? "",
    city: d.city ?? "",
    state: d.state ?? "",
    postal_code: d.postal_code ?? "",
    country: d.country ?? "",
    timezone: d.timezone,
    google_review_link: d.google_review_link,
    logo_url: d.logo_url ?? "",
    primary_brand_color: d.primary_brand_color ?? "",
    email_sending_domain: d.email_sending_domain ?? "",
    follow_up_count: d.follow_up_count,
    review_request_limit_14_days: d.review_request_limit_14_days,
    ask_for_referral: d.ask_for_referral,
  };

  const { data, error } = await admin.rpc("submit_onboarding", {
    p_token_hash: hashInvitationToken(rawToken),
    p_payload: payload,
  });

  if (error) {
    // Log server-side for debugging; the client only ever sees a generic result.
    console.error("[onboarding] submit_onboarding failed", { code: error.code, message: error.message });
    return mapRpcError(error.message);
  }

  const result = (data ?? {}) as { client_account_id?: string; provisioning_run_id?: string };
  if (!result.client_account_id || !result.provisioning_run_id) {
    return { ok: false, code: "error" };
  }

  return {
    ok: true,
    clientAccountId: result.client_account_id,
    provisioningRunId: result.provisioning_run_id,
  };
}
