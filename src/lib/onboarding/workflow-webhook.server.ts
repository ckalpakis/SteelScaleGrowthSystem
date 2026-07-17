// =============================================================================
// Client review-workflow webhook — Supabase store + real sender wiring.
// Server-only. Pairs with the pure core in workflow-webhook.ts.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

import { buildReviewMessage } from "@/lib/review/messageBuilder";
import { sendMessage } from "@/lib/review/services/twilioService";
import { isTwilioConfigured } from "@/lib/onboarding/test-config";
import { normalizePhoneToE164 } from "@/lib/onboarding/validation";
import type { WorkflowClient, WorkflowCredential, WorkflowDeps, WorkflowStore } from "@/lib/onboarding/workflow-webhook";

export class SupabaseWorkflowStore implements WorkflowStore {
  constructor(private readonly admin: SupabaseClient) {}

  async getClientByLocationId(locationId: string): Promise<WorkflowClient | null> {
    const { data: loc } = await this.admin
      .from("ghl_locations")
      .select("client_account_id")
      .eq("ghl_location_id", locationId)
      .maybeSingle<{ client_account_id: string }>();
    if (!loc) return null;
    const { data: client } = await this.admin
      .from("client_accounts")
      .select("id, public_business_name, google_review_link, status")
      .eq("id", loc.client_account_id)
      .maybeSingle<WorkflowClient>();
    return client ?? null;
  }

  async getCredentialByClient(clientAccountId: string): Promise<WorkflowCredential | null> {
    const { data } = await this.admin
      .from("client_webhook_credentials")
      .select("client_account_id, secret_hash, enabled")
      .eq("client_account_id", clientAccountId)
      .maybeSingle<{ client_account_id: string; secret_hash: string; enabled: boolean }>();
    return data ? { clientAccountId: data.client_account_id, secretHash: data.secret_hash, enabled: data.enabled } : null;
  }

  async recordEventOnce(input: { idempotencyKey: string; clientAccountId: string; locationId: string; eventType: string }): Promise<"new" | "duplicate"> {
    const { error } = await this.admin.from("workflow_webhook_events").insert({
      idempotency_key: input.idempotencyKey,
      client_account_id: input.clientAccountId,
      ghl_location_id: input.locationId,
      event_type: input.eventType,
      status: "received",
    });
    if (error) {
      // Unique violation → already processed once.
      if (error.code === "23505") return "duplicate";
      throw new Error(`recordEventOnce failed: ${error.message}`);
    }
    return "new";
  }

  async setEventStatus(idempotencyKey: string, status: "processed" | "skipped" | "failed", safeError?: string): Promise<void> {
    await this.admin.from("workflow_webhook_events").update({ status, safe_error_message: safeError ?? null }).eq("idempotency_key", idempotencyKey);
  }
}

/** Production deps: real store, real Twilio sender, real config check. */
export function workflowDeps(admin: SupabaseClient): WorkflowDeps {
  return {
    store: new SupabaseWorkflowStore(admin),
    twilioConfigured: isTwilioConfigured,
    sendReview: async (p) => {
      const to = normalizePhoneToE164(p.to);
      if (!to) throw new Error("invalid phone");
      const body = buildReviewMessage({ firstName: p.firstName, businessName: p.businessName, reviewLink: p.reviewLink });
      await sendMessage({ to, body });
    },
  };
}
