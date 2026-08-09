// =============================================================================
// Integration state port — concrete server wiring.
//
// Marks a connection healthy/errored in integration_connections +
// company_integrations, and notifies the account when re-authentication is
// required (in-app via an event + log, and by email). Server-only.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendIntegrationAuthExpiredEmail } from "@/lib/email";
import { integrationDef } from "@/lib/integrations";
import type { IntegrationStatePort } from "@/lib/integration/ports";

export interface StatePortContext {
  companyId: string;
  provider: string;
  /** Where to email the "reconnect required" notice. */
  notifyEmail?: string | null;
}

export function createIntegrationStatePort(admin: SupabaseClient, ctx: StatePortContext): IntegrationStatePort {
  const providerName = integrationDef(ctx.provider)?.name ?? ctx.provider;

  return {
    async markStatus(status, reason) {
      const patch = { status, last_error: reason ?? null };
      // Best-effort on both the display table and the canonical store.
      await admin.from("integration_connections").update(patch).eq("company_id", ctx.companyId).eq("provider", ctx.provider);
      await admin.from("company_integrations").update(patch).eq("company_id", ctx.companyId).eq("provider", ctx.provider);
    },

    async notifyAuthExpired(reason) {
      // In-app signal: an event + an error log the dashboard surfaces.
      await admin.from("integration_events").insert({
        company_id: ctx.companyId,
        provider: ctx.provider,
        event_type: "integration.auth_expired",
        status: "failed",
        payload: { reason: reason ?? null },
      });
      await admin.from("integration_logs").insert({
        company_id: ctx.companyId,
        provider: ctx.provider,
        level: "error",
        action: "auth.expired",
        message: reason ?? "Authentication expired",
      });
      // Email notification (fails soft).
      if (ctx.notifyEmail) {
        await sendIntegrationAuthExpiredEmail(ctx.notifyEmail, providerName, reason ?? null);
      }
    },
  };
}
