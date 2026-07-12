// =============================================================================
// Reference skeleton — how a future provider extends the base adapter.
//
// This is the TEMPLATE for onboarding a new CRM. A real provider fills in the
// abstract methods with actual API calls + webhook parsing; the reusable
// orchestration (sync, normalize, publish) is inherited. Everything here throws
// notImplemented() on purpose — no APIs are wired yet.
// =============================================================================

import { AbstractIntegrationAdapter, type IntegrationContext } from "@/lib/integration/adapter";
import type { OAuthTokens } from "@/lib/integration/ports";
import type {
  SyncOptions,
  RawPage,
  ConnectParams,
  ConnectResult,
  WebhookRequest,
  ParsedWebhook,
} from "@/lib/integration/types";

function notImplemented(method: string): never {
  throw new Error(`SkeletonIntegrationAdapter.${method}() is not implemented yet.`);
}

/**
 * Copy this class per provider (e.g. JobberIntegrationAdapter) and implement the
 * bodies. Pair it with the matching CRM mapper via ctx.crm.
 */
export class SkeletonIntegrationAdapter extends AbstractIntegrationAdapter {
  constructor(ctx: IntegrationContext) {
    super(ctx);
  }

  // --- lifecycle -----------------------------------------------------------
  async connect(_params: ConnectParams): Promise<ConnectResult> {
    // Exchange the OAuth code for tokens, persist via this.credentials.save().
    return notImplemented("connect");
  }
  async disconnect(): Promise<void> {
    // Revoke tokens with the provider, then this.credentials.clear().
    return notImplemented("disconnect");
  }
  async refreshToken(): Promise<OAuthTokens> {
    // POST the refresh_token grant and return the new token set.
    return notImplemented("refreshToken");
  }

  // --- raw fetch (paginated) ----------------------------------------------
  protected async fetchCustomers(_opts: SyncOptions): Promise<RawPage> {
    return notImplemented("fetchCustomers");
  }
  protected async fetchJobs(_opts: SyncOptions): Promise<RawPage> {
    return notImplemented("fetchJobs");
  }
  protected async fetchInvoices(_opts: SyncOptions): Promise<RawPage> {
    return notImplemented("fetchInvoices");
  }
  protected async fetchAppointments(_opts: SyncOptions): Promise<RawPage> {
    return notImplemented("fetchAppointments");
  }

  // --- webhooks ------------------------------------------------------------
  verifyWebhook(_request: WebhookRequest): boolean {
    // Verify the provider's signature header against the raw body.
    return notImplemented("verifyWebhook");
  }
  protected async parseWebhook(_request: WebhookRequest): Promise<ParsedWebhook> {
    // Map the provider's webhook topic to a PlatformEventType + raw record(s):
    //   e.g. "job.completed" -> { objectType: "job", eventType: "JOB_COMPLETED", raw }
    return notImplemented("parseWebhook");
  }
}
