// =============================================================================
// Jobber integration adapter.
//
// ALL Jobber-specific logic is isolated here: OAuth endpoints/scopes, webhook
// topic → event mapping, and the (placeholder) API calls. Data mapping is
// delegated to the pure Jobber CRM mapper (@/lib/crm/adapters/jobber), so the
// universal-model translation lives in exactly one place.
//
// The reusable orchestration — syncCustomers / syncJobs / syncAppointments /
// publishEvents / receiveWebhook — is INHERITED from AbstractIntegrationAdapter
// and is already functional; it drives the placeholder fetch/connect methods
// below. No live API calls are wired yet: the network boundaries throw
// notImplemented() until the HTTP layer is added.
// =============================================================================

import { jobberAdapter } from "@/lib/crm/adapters/jobber";
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
export const JOBBER_OAUTH = {
  authorizeUrl: "https://api.getjobber.com/api/oauth/authorize",
  tokenUrl: "https://api.getjobber.com/api/oauth/token",
  apiUrl: "https://api.getjobber.com/api/graphql",
  /** Scopes we request. Adjust to the minimum the product needs. */
  scopes: ["read_clients", "read_jobs", "read_invoices", "read_quotes", "read_scheduling"],
} as const;

export interface JobberOAuthConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

/** Read Jobber OAuth config from the environment (server-only). */
export function jobberOAuthConfig(): JobberOAuthConfig {
  return {
    clientId: process.env.JOBBER_CLIENT_ID,
    clientSecret: process.env.JOBBER_CLIENT_SECRET,
    redirectUri: process.env.JOBBER_REDIRECT_URI,
  };
}

// ------------------------------------------------- webhook topic → event map
/** Jobber webhook topic → canonical object + platform event. Provider-isolated. */
export const JOBBER_WEBHOOK_EVENTS: Record<string, { objectType: CanonicalObjectType; eventType: PlatformEventType }> = {
  CLIENT_CREATE: { objectType: "customer", eventType: "CUSTOMER_CREATED" },
  CLIENT_EDIT: { objectType: "customer", eventType: "CUSTOMER_UPDATED" },
  JOB_CREATE: { objectType: "job", eventType: "JOB_CREATED" },
  JOB_START: { objectType: "job", eventType: "JOB_STARTED" },
  JOB_COMPLETE: { objectType: "job", eventType: "JOB_COMPLETED" },
  QUOTE_APPROVAL: { objectType: "estimate", eventType: "ESTIMATE_ACCEPTED" },
  QUOTE_DECLINE: { objectType: "estimate", eventType: "ESTIMATE_DECLINED" },
  INVOICE_CREATE: { objectType: "invoice", eventType: "INVOICE_CREATED" },
  INVOICE_PAID: { objectType: "invoice", eventType: "INVOICE_PAID" },
  VISIT_COMPLETE: { objectType: "appointment", eventType: "APPOINTMENT_COMPLETED" },
};

/** Map a Jobber webhook topic to its canonical object + event (or null). */
export function mapJobberTopic(topic: string) {
  return JOBBER_WEBHOOK_EVENTS[topic] ?? null;
}

function notImplemented(method: string): never {
  throw new Error(`JobberIntegrationAdapter.${method}() is not implemented yet (no live API calls).`);
}

// ---------------------------------------------------------------- adapter
export class JobberIntegrationAdapter extends AbstractIntegrationAdapter {
  private readonly oauth: JobberOAuthConfig;

  constructor(ctx: Omit<IntegrationContext, "provider" | "crm">) {
    // Provider + CRM mapper are fixed for Jobber; callers only inject deps.
    super({ ...ctx, provider: "jobber", crm: jobberAdapter });
    this.oauth = jobberOAuthConfig();
  }

  /** Build the OAuth authorization URL to send the user to (pure, no network). */
  authorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.oauth.clientId ?? "",
      redirect_uri: this.oauth.redirectUri ?? "",
      response_type: "code",
      scope: JOBBER_OAUTH.scopes.join(" "),
      state,
    });
    return `${JOBBER_OAUTH.authorizeUrl}?${params.toString()}`;
  }

  // --- lifecycle (placeholders) -------------------------------------------
  async connect(params: ConnectParams): Promise<ConnectResult> {
    if (!this.oauth.clientId || !this.oauth.clientSecret) {
      return { status: "error", error: "Jobber OAuth is not configured (JOBBER_CLIENT_ID / JOBBER_CLIENT_SECRET)." };
    }
    if (!params.code) return { status: "error", error: "Missing OAuth authorization code." };
    // PLACEHOLDER: POST params.code to JOBBER_OAUTH.tokenUrl (grant_type=
    // authorization_code), persist tokens via this.credentials?.save(), and
    // resolve the connected user. No live call yet.
    return notImplemented("connect");
  }

  async disconnect(): Promise<void> {
    // PLACEHOLDER: revoke the token with Jobber, then this.credentials?.clear().
    return notImplemented("disconnect");
  }

  async refreshToken(): Promise<OAuthTokens> {
    // PLACEHOLDER: POST grant_type=refresh_token to JOBBER_OAUTH.tokenUrl and
    // return the new token set. Called automatically by the base before syncs.
    return notImplemented("refreshToken");
  }

  // --- raw fetch (placeholders that drive the inherited sync*) --------------
  protected async fetchCustomers(_opts: SyncOptions): Promise<RawPage> {
    // PLACEHOLDER: GraphQL `clients` query (paginated) against JOBBER_OAUTH.apiUrl.
    return notImplemented("fetchCustomers");
  }
  protected async fetchJobs(_opts: SyncOptions): Promise<RawPage> {
    // PLACEHOLDER: GraphQL `jobs` query (paginated).
    return notImplemented("fetchJobs");
  }
  protected async fetchInvoices(_opts: SyncOptions): Promise<RawPage> {
    // PLACEHOLDER: GraphQL `invoices` query (paginated).
    return notImplemented("fetchInvoices");
  }
  protected async fetchAppointments(_opts: SyncOptions): Promise<RawPage> {
    // PLACEHOLDER: GraphQL `visits` query (paginated).
    return notImplemented("fetchAppointments");
  }

  // --- webhooks ------------------------------------------------------------
  verifyWebhook(_request: WebhookRequest): boolean {
    // PLACEHOLDER: verify the X-Jobber-Hmac-SHA256 header against the raw body
    // using the app's webhook secret.
    return notImplemented("verifyWebhook");
  }

  protected async parseWebhook(_request: WebhookRequest): Promise<ParsedWebhook> {
    // PLACEHOLDER: read the topic + record id from the payload, look it up with
    // mapJobberTopic(), fetch the full record, and return ParsedWebhook items.
    // Topic → event mapping already lives in JOBBER_WEBHOOK_EVENTS above.
    return notImplemented("parseWebhook");
  }
}

/** Construct a Jobber adapter — callers inject only tenant + dependency ports. */
export function createJobberIntegration(
  ctx: Omit<IntegrationContext, "provider" | "crm">
): JobberIntegrationAdapter {
  return new JobberIntegrationAdapter(ctx);
}
