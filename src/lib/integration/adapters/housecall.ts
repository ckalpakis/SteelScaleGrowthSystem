// =============================================================================
// Housecall Pro integration adapter.
//
// Same interface and same base class as Jobber — no architecture is duplicated.
// This module only carries HCP-specific config: OAuth endpoints, the webhook
// topic → event map, and the (placeholder) API calls. Data mapping is delegated
// to the pure HCP CRM mapper (@/lib/crm/adapters/housecall).
//
// syncCustomers / syncJobs / syncAppointments / receiveWebhook / publishEvents /
// normalizeData are all INHERITED from AbstractIntegrationAdapter and publish
// the same standardized platform events every other provider does.
// =============================================================================

import { housecallAdapter } from "@/lib/crm/adapters/housecall";
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
import type { CanonicalObjectType } from "@/lib/crm/models";
import type { PlatformEventType } from "@/lib/events/types";

// ---------------------------------------------------------------- OAuth config
export const HOUSECALL_OAUTH = {
  authorizeUrl: "https://pro.housecallpro.com/oauth/authorize",
  tokenUrl: "https://api.housecallpro.com/oauth/token",
  apiUrl: "https://api.housecallpro.com",
  scopes: ["customers.read", "jobs.read", "invoices.read", "schedule.read"],
} as const;

export interface HousecallOAuthConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

/** Read Housecall Pro OAuth config from the environment (server-only). */
export function housecallOAuthConfig(): HousecallOAuthConfig {
  return {
    clientId: process.env.HOUSECALL_CLIENT_ID,
    clientSecret: process.env.HOUSECALL_CLIENT_SECRET,
    redirectUri: process.env.HOUSECALL_REDIRECT_URI,
  };
}

// ------------------------------------------------- webhook topic → event map
/** HCP webhook event name → canonical object + platform event. Provider-isolated. */
export const HOUSECALL_WEBHOOK_EVENTS: Record<string, { objectType: CanonicalObjectType; eventType: PlatformEventType }> = {
  "customer.created": { objectType: "customer", eventType: "CUSTOMER_CREATED" },
  "customer.updated": { objectType: "customer", eventType: "CUSTOMER_UPDATED" },
  "job.created": { objectType: "job", eventType: "JOB_CREATED" },
  "job.scheduled": { objectType: "job", eventType: "JOB_SCHEDULED" },
  "job.started": { objectType: "job", eventType: "JOB_STARTED" },
  "job.completed": { objectType: "job", eventType: "JOB_COMPLETED" },
  "invoice.created": { objectType: "invoice", eventType: "INVOICE_CREATED" },
  "invoice.paid": { objectType: "invoice", eventType: "INVOICE_PAID" },
  "appointment.completed": { objectType: "appointment", eventType: "APPOINTMENT_COMPLETED" },
};

/** Map an HCP webhook event name to its canonical object + event (or null). */
export function mapHousecallTopic(topic: string) {
  return HOUSECALL_WEBHOOK_EVENTS[topic] ?? null;
}

function notImplemented(method: string): never {
  throw new Error(`HousecallProIntegrationAdapter.${method}() is not implemented yet (no live API calls).`);
}

// ---------------------------------------------------------------- adapter
export class HousecallProIntegrationAdapter extends AbstractIntegrationAdapter {
  private readonly oauth: HousecallOAuthConfig;

  constructor(ctx: Omit<IntegrationContext, "provider" | "crm">) {
    super({ ...ctx, provider: "housecall_pro", crm: housecallAdapter });
    this.oauth = housecallOAuthConfig();
  }

  /** Build the OAuth authorization URL (pure, no network). */
  authorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.oauth.clientId ?? "",
      redirect_uri: this.oauth.redirectUri ?? "",
      response_type: "code",
      scope: HOUSECALL_OAUTH.scopes.join(" "),
      state,
    });
    return `${HOUSECALL_OAUTH.authorizeUrl}?${params.toString()}`;
  }

  // --- lifecycle (placeholders) -------------------------------------------
  async connect(params: ConnectParams): Promise<ConnectResult> {
    if (!this.oauth.clientId || !this.oauth.clientSecret) {
      return { status: "error", error: "Housecall Pro OAuth is not configured (HOUSECALL_CLIENT_ID / SECRET)." };
    }
    if (!params.code) return { status: "error", error: "Missing OAuth authorization code." };
    // PLACEHOLDER: exchange params.code at HOUSECALL_OAUTH.tokenUrl, persist via
    // this.credentials?.save(), resolve the connected user.
    return notImplemented("connect");
  }

  async disconnect(): Promise<void> {
    // PLACEHOLDER: revoke token, then this.credentials?.clear().
    return notImplemented("disconnect");
  }

  async refreshToken(): Promise<OAuthTokens> {
    // PLACEHOLDER: grant_type=refresh_token against HOUSECALL_OAUTH.tokenUrl.
    return notImplemented("refreshToken");
  }

  // --- raw fetch (placeholders that drive the inherited sync*) --------------
  protected async fetchCustomers(_opts: SyncOptions): Promise<RawPage> {
    // PLACEHOLDER: GET /customers (paginated) against HOUSECALL_OAUTH.apiUrl.
    return notImplemented("fetchCustomers");
  }
  protected async fetchJobs(_opts: SyncOptions): Promise<RawPage> {
    // PLACEHOLDER: GET /jobs (paginated).
    return notImplemented("fetchJobs");
  }
  protected async fetchInvoices(_opts: SyncOptions): Promise<RawPage> {
    // PLACEHOLDER: GET /invoices (paginated).
    return notImplemented("fetchInvoices");
  }
  protected async fetchAppointments(_opts: SyncOptions): Promise<RawPage> {
    // PLACEHOLDER: GET /appointments (paginated).
    return notImplemented("fetchAppointments");
  }

  // --- webhooks ------------------------------------------------------------
  verifyWebhook(_request: WebhookRequest): boolean {
    // PLACEHOLDER: verify the HCP signature header against the raw body.
    return notImplemented("verifyWebhook");
  }

  protected async parseWebhook(_request: WebhookRequest): Promise<ParsedWebhook> {
    // PLACEHOLDER: read event name + record from the payload, map it with
    // mapHousecallTopic(), and return ParsedWebhook items for the base to
    // normalize + publish.
    return notImplemented("parseWebhook");
  }
}

/** Construct an HCP adapter — callers inject only tenant + dependency ports. */
export function createHousecallProIntegration(
  ctx: Omit<IntegrationContext, "provider" | "crm">
): HousecallProIntegrationAdapter {
  return new HousecallProIntegrationAdapter(ctx);
}
