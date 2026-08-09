// =============================================================================
// ServiceTitan integration adapter.
//
// Same interface and base class as every other provider — no architecture is
// duplicated. Only ServiceTitan-specific config lives here: its auth model
// (OAuth2 client-credentials + ST-App-Key + tenant id, not an authorization-code
// redirect), the webhook event → platform event map, and the placeholder API
// calls. Data mapping is delegated to the pure ServiceTitan CRM mapper.
//
// sync* / receiveWebhook / publishEvents / normalizeData are inherited and emit
// only the standardized platform events.
// =============================================================================

import { servicetitanAdapter } from "@/lib/crm/adapters/servicetitan";
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

// ---------------------------------------------------------------- auth config
export const SERVICETITAN_OAUTH = {
  // ServiceTitan uses the client-credentials grant against its auth host.
  tokenUrl: "https://auth.servicetitan.io/connect/token",
  apiUrl: "https://api.servicetitan.io",
  scopes: ["customers", "jobs", "invoices", "estimates", "scheduling"],
} as const;

export interface ServiceTitanConfig {
  clientId?: string;
  clientSecret?: string;
  /** ST-App-Key header value for every API request. */
  appKey?: string;
  /** The ServiceTitan tenant id (path segment on API calls). */
  tenantId?: string;
}

/** Read ServiceTitan config from the environment (server-only). */
export function servicetitanConfig(): ServiceTitanConfig {
  return {
    clientId: process.env.SERVICETITAN_CLIENT_ID,
    clientSecret: process.env.SERVICETITAN_CLIENT_SECRET,
    appKey: process.env.SERVICETITAN_APP_KEY,
    tenantId: process.env.SERVICETITAN_TENANT_ID,
  };
}

// ------------------------------------------------- webhook topic → event map
/** ServiceTitan event → canonical object + platform event. Provider-isolated. */
export const SERVICETITAN_WEBHOOK_EVENTS: Record<string, { objectType: CanonicalObjectType; eventType: PlatformEventType }> = {
  "Customer.Created": { objectType: "customer", eventType: "CUSTOMER_CREATED" },
  "Customer.Modified": { objectType: "customer", eventType: "CUSTOMER_UPDATED" },
  "Job.Created": { objectType: "job", eventType: "JOB_CREATED" },
  "Job.Scheduled": { objectType: "job", eventType: "JOB_SCHEDULED" },
  "Job.InProgress": { objectType: "job", eventType: "JOB_STARTED" },
  "Job.Completed": { objectType: "job", eventType: "JOB_COMPLETED" },
  "Estimate.Sold": { objectType: "estimate", eventType: "ESTIMATE_ACCEPTED" },
  "Estimate.Dismissed": { objectType: "estimate", eventType: "ESTIMATE_DECLINED" },
  "Invoice.Created": { objectType: "invoice", eventType: "INVOICE_CREATED" },
  "Invoice.Paid": { objectType: "invoice", eventType: "INVOICE_PAID" },
  "Appointment.Completed": { objectType: "appointment", eventType: "APPOINTMENT_COMPLETED" },
};

/** Map a ServiceTitan event name to its canonical object + event (or null). */
export function mapServiceTitanEvent(event: string) {
  return SERVICETITAN_WEBHOOK_EVENTS[event] ?? null;
}

function notImplemented(method: string): never {
  throw new Error(`ServiceTitanIntegrationAdapter.${method}() is not implemented yet (no live API calls).`);
}

// ---------------------------------------------------------------- adapter
export class ServiceTitanIntegrationAdapter extends AbstractIntegrationAdapter {
  private readonly config: ServiceTitanConfig;

  constructor(ctx: Omit<IntegrationContext, "provider" | "crm">) {
    super({ ...ctx, provider: "servicetitan", crm: servicetitanAdapter });
    this.config = servicetitanConfig();
  }

  private configured(): boolean {
    return Boolean(this.config.clientId && this.config.clientSecret && this.config.appKey && this.config.tenantId);
  }

  // --- lifecycle (placeholders) -------------------------------------------
  async connect(_params: ConnectParams): Promise<ConnectResult> {
    // ServiceTitan uses client-credentials, so there is no user redirect/code —
    // "connecting" means the tenant supplies client id/secret, app key, tenant id.
    if (!this.configured()) {
      return {
        status: "error",
        error: "ServiceTitan is not configured (SERVICETITAN_CLIENT_ID / SECRET / APP_KEY / TENANT_ID).",
      };
    }
    // PLACEHOLDER: request a client-credentials token at SERVICETITAN_OAUTH.tokenUrl,
    // persist it via this.credentials?.save(), and mark the tenant connected.
    return notImplemented("connect");
  }

  async disconnect(): Promise<void> {
    // PLACEHOLDER: drop stored credentials via this.credentials?.clear().
    return notImplemented("disconnect");
  }

  async refreshToken(): Promise<OAuthTokens> {
    // PLACEHOLDER: client-credentials tokens are short-lived — re-request a new
    // access token at SERVICETITAN_OAUTH.tokenUrl.
    return notImplemented("refreshToken");
  }

  // --- raw fetch (placeholders that drive the inherited sync*) --------------
  protected async fetchCustomers(_opts: SyncOptions): Promise<RawPage> {
    // PLACEHOLDER: GET /crm/v2/tenant/{tenantId}/customers (paginated), with the
    // ST-App-Key header.
    return notImplemented("fetchCustomers");
  }
  protected async fetchJobs(_opts: SyncOptions): Promise<RawPage> {
    // PLACEHOLDER: GET /jpm/v2/tenant/{tenantId}/jobs (paginated).
    return notImplemented("fetchJobs");
  }
  protected async fetchInvoices(_opts: SyncOptions): Promise<RawPage> {
    // PLACEHOLDER: GET /accounting/v2/tenant/{tenantId}/invoices (paginated).
    return notImplemented("fetchInvoices");
  }
  protected async fetchAppointments(_opts: SyncOptions): Promise<RawPage> {
    // PLACEHOLDER: GET /jpm/v2/tenant/{tenantId}/appointments (paginated).
    return notImplemented("fetchAppointments");
  }

  // --- webhooks ------------------------------------------------------------
  verifyWebhook(_request: WebhookRequest): boolean {
    // PLACEHOLDER: verify the ServiceTitan webhook signature against the raw body.
    return notImplemented("verifyWebhook");
  }

  protected async parseWebhook(_request: WebhookRequest): Promise<ParsedWebhook> {
    // PLACEHOLDER: read the event name + record id, map it with
    // mapServiceTitanEvent(), fetch the record, and return ParsedWebhook items.
    return notImplemented("parseWebhook");
  }
}

/** Construct a ServiceTitan adapter — callers inject only tenant + dependency ports. */
export function createServiceTitanIntegration(
  ctx: Omit<IntegrationContext, "provider" | "crm">
): ServiceTitanIntegrationAdapter {
  return new ServiceTitanIntegrationAdapter(ctx);
}
