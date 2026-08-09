// =============================================================================
// Integration adapter system — the common interface + abstract base class.
//
// Every CRM integration implements the SAME interface (connect, disconnect,
// refreshToken, syncCustomers/Jobs/Invoices/Appointments, receiveWebhook,
// normalizeData, publishEvents). Providers extend AbstractIntegrationAdapter and
// implement only the provider-specific primitives (the actual API calls +
// webhook parsing); everything reusable — normalization, event assembly,
// publishing, sync orchestration, token-freshness — lives in the base.
//
// No API/network code here. The provider-specific fetch/connect/parse methods
// are declared `abstract` and implemented later, per provider.
// =============================================================================

import {
  mapRecord,
  type CrmProviderAdapter,
  type CrmProvider,
  type CanonicalObjectType,
  type CanonicalObjectMap,
  type CanonicalRecord,
  type CanonicalCustomer,
  type CanonicalJob,
  type CanonicalInvoice,
  type CanonicalEstimate,
  type CanonicalAppointment,
} from "@/lib/crm";
import {
  createEvent,
  events as sharedBus,
  type EventBus,
  type PlatformEvent,
  type PlatformEventType,
  type EventPayloadMap,
  type EventCustomerRef,
} from "@/lib/events";
import type {
  CredentialStore,
  IntegrationLogger,
  CanonicalRecordSink,
  IntegrationStatePort,
  OAuthTokens,
} from "@/lib/integration/ports";
import { withRetry, isRetryable } from "@/lib/integration/retry";
import type {
  SyncOptions,
  SyncResult,
  RawPage,
  ConnectParams,
  ConnectResult,
  WebhookRequest,
  ParsedWebhook,
  WebhookResult,
} from "@/lib/integration/types";

/** Everything an adapter instance needs, injected at construction. */
export interface IntegrationContext {
  companyId: string;
  provider: CrmProvider;
  /** Pure data mapper for this provider (from @/lib/crm). */
  crm: CrmProviderAdapter;
  /** Event bus to publish onto. Defaults to the shared bus. */
  bus?: EventBus;
  credentials?: CredentialStore;
  logger?: IntegrationLogger;
  /** Optional store for normalized records produced by sync. */
  sink?: CanonicalRecordSink;
  /** Health/notification port — marks connections in error, notifies on re-auth. */
  state?: IntegrationStatePort;
  /** Retry tuning for syncs / webhooks / token refresh. */
  retry?: { maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number };
  now?: () => Date;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

/** The uniform contract every CRM integration implements. */
export interface IntegrationAdapter {
  connect(params: ConnectParams): Promise<ConnectResult>;
  disconnect(): Promise<void>;
  refreshToken(): Promise<OAuthTokens>;
  syncCustomers(opts?: SyncOptions): Promise<SyncResult>;
  syncJobs(opts?: SyncOptions): Promise<SyncResult>;
  syncInvoices(opts?: SyncOptions): Promise<SyncResult>;
  syncAppointments(opts?: SyncOptions): Promise<SyncResult>;
  receiveWebhook(request: WebhookRequest): Promise<WebhookResult>;
  normalizeData<K extends CanonicalObjectType>(objectType: K, raw: unknown): CanonicalObjectMap[K];
  publishEvents(events: PlatformEvent[]): Promise<void>;
}

export abstract class AbstractIntegrationAdapter implements IntegrationAdapter {
  protected readonly companyId: string;
  protected readonly provider: CrmProvider;
  protected readonly crm: CrmProviderAdapter;
  protected readonly bus: EventBus;
  protected readonly credentials?: CredentialStore;
  protected readonly logger?: IntegrationLogger;
  protected readonly sink?: CanonicalRecordSink;
  protected readonly state?: IntegrationStatePort;
  protected readonly retryCfg: RetryConfig;
  protected readonly now: () => Date;

  constructor(ctx: IntegrationContext) {
    this.companyId = ctx.companyId;
    this.provider = ctx.provider;
    this.crm = ctx.crm;
    this.bus = ctx.bus ?? sharedBus;
    this.credentials = ctx.credentials;
    this.logger = ctx.logger;
    this.sink = ctx.sink;
    this.state = ctx.state;
    this.retryCfg = {
      maxAttempts: ctx.retry?.maxAttempts ?? 4,
      baseDelayMs: ctx.retry?.baseDelayMs ?? 500,
      maxDelayMs: ctx.retry?.maxDelayMs ?? 30_000,
    };
    this.now = ctx.now ?? (() => new Date());
  }

  /**
   * Run an operation with retries + structured logging. Logs every attempt and
   * the final outcome to integration_logs (an entry per API request), with
   * duration and detailed error context. Rethrows after exhausting attempts.
   */
  protected async execute<T>(
    action: string,
    fn: () => Promise<T>,
    opts: { retryable?: (e: unknown) => boolean; maxAttempts?: number; context?: Record<string, unknown> } = {}
  ): Promise<T> {
    const started = Date.now();
    try {
      const value = await withRetry(() => fn(), {
        maxAttempts: opts.maxAttempts ?? this.retryCfg.maxAttempts,
        baseDelayMs: this.retryCfg.baseDelayMs,
        maxDelayMs: this.retryCfg.maxDelayMs,
        retryable: opts.retryable ?? isRetryable,
        onRetry: async ({ attempt, delayMs, error }) => {
          await this.logger?.log({
            level: "warn",
            action,
            message: `attempt ${attempt} failed; retrying in ${delayMs}ms`,
            context: { ...opts.context, attempt, error: errText(error) },
          });
        },
      });
      await this.logger?.log({ level: "info", action, durationMs: Date.now() - started, context: opts.context });
      return value;
    } catch (err) {
      await this.logger?.log({
        level: "error",
        action,
        message: errText(err),
        durationMs: Date.now() - started,
        context: { ...opts.context, error: errText(err), stack: err instanceof Error ? err.stack : undefined },
      });
      throw err;
    }
  }

  // ===========================================================================
  // Provider-specific primitives — implemented per provider (no APIs yet).
  // ===========================================================================
  abstract connect(params: ConnectParams): Promise<ConnectResult>;
  abstract disconnect(): Promise<void>;
  abstract refreshToken(): Promise<OAuthTokens>;

  /** Fetch a page of raw provider records. */
  protected abstract fetchCustomers(opts: SyncOptions): Promise<RawPage>;
  protected abstract fetchJobs(opts: SyncOptions): Promise<RawPage>;
  protected abstract fetchInvoices(opts: SyncOptions): Promise<RawPage>;
  protected abstract fetchAppointments(opts: SyncOptions): Promise<RawPage>;

  /** Validate a webhook's authenticity (signature check). */
  abstract verifyWebhook(request: WebhookRequest): boolean | Promise<boolean>;
  /** Turn a verified webhook body into normalized-able items. */
  protected abstract parseWebhook(request: WebhookRequest): Promise<ParsedWebhook>;

  // ===========================================================================
  // Reusable orchestration — shared by every provider.
  // ===========================================================================

  /** Map a raw provider record into its canonical object via the CRM mapper. */
  normalizeData<K extends CanonicalObjectType>(objectType: K, raw: unknown): CanonicalObjectMap[K] {
    return mapRecord(this.crm, objectType, raw, {
      companyId: this.companyId,
      provider: this.provider,
      now: this.now,
    });
  }

  /** Publish events onto the bus, error-isolated per event. */
  async publishEvents(events: PlatformEvent[]): Promise<void> {
    for (const event of events) {
      const result = await this.bus.emit(event);
      if (result.errors.length) {
        await this.logger?.log({
          level: "warn",
          action: "publish_events",
          message: `${result.errors.length} handler error(s) for ${event.type}`,
          context: { eventId: event.id },
        });
      }
    }
  }

  async syncCustomers(opts: SyncOptions = {}): Promise<SyncResult> {
    return this.runSync("customer", (o) => this.fetchCustomers(o), opts);
  }
  async syncJobs(opts: SyncOptions = {}): Promise<SyncResult> {
    return this.runSync("job", (o) => this.fetchJobs(o), opts);
  }
  async syncInvoices(opts: SyncOptions = {}): Promise<SyncResult> {
    return this.runSync("invoice", (o) => this.fetchInvoices(o), opts);
  }
  async syncAppointments(opts: SyncOptions = {}): Promise<SyncResult> {
    return this.runSync("appointment", (o) => this.fetchAppointments(o), opts);
  }

  async receiveWebhook(request: WebhookRequest): Promise<WebhookResult> {
    const verified = await this.verifyWebhook(request);
    if (!verified) {
      await this.logger?.log({ level: "warn", action: "webhook.verify", message: "signature rejected" });
      return { verified: false, published: 0, events: [] };
    }

    // Retry webhook parsing (it may fetch the full record from the provider).
    const parsed = await this.execute("webhook.parse", () => this.parseWebhook(request));
    const events: PlatformEvent[] = [];
    for (const item of parsed.items) {
      // Provider supplied a ready-made event (e.g. PAYMENT_RECEIVED).
      if (item.event) {
        events.push(item.event);
        continue;
      }
      if (!item.eventType || item.raw === undefined) continue;
      const record = this.normalizeData(item.objectType, item.raw) as CanonicalRecord;
      events.push(this.buildEvent(item.eventType, item.objectType, record, "webhook"));
    }

    await this.publishEvents(events);
    await this.logger?.log({ level: "info", action: "webhook.received", context: { published: events.length } });
    return { verified: true, published: events.length, events };
  }

  // ---------------------------------------------------------------- internals
  /**
   * Template method for a sync: ensure a fresh token, fetch a page, normalize
   * each record, persist to the sink, derive + publish events, return a summary.
   */
  protected async runSync<K extends CanonicalObjectType>(
    objectType: K,
    fetch: (opts: SyncOptions) => Promise<RawPage>,
    opts: SyncOptions
  ): Promise<SyncResult> {
    const started = Date.now();
    await this.ensureFreshToken();

    // Retry the fetch on transient failure; every attempt + outcome is logged.
    const page = await this.execute(`sync.fetch.${objectType}`, () => fetch(opts), {
      context: { objectType, cursor: opts.cursor ?? null },
    });
    const records: CanonicalRecord[] = [];
    const errors: SyncResult["errors"] = [];

    page.records.forEach((raw, index) => {
      try {
        records.push(this.normalizeData(objectType, raw) as CanonicalRecord);
      } catch (err) {
        errors.push({ index, message: err instanceof Error ? err.message : String(err) });
      }
    });

    if (records.length) await this.sink?.upsert(records);

    const events = this.eventsForSync(objectType, records);
    await this.publishEvents(events);

    await this.logger?.log({
      level: "info",
      action: `sync.${objectType}`,
      context: { fetched: page.records.length, normalized: records.length, published: events.length, errors: errors.length },
      durationMs: Date.now() - started,
    });

    return {
      objectType,
      fetched: page.records.length,
      normalized: records.length,
      published: events.length,
      errors,
      cursor: page.cursor ?? null,
      hasMore: page.hasMore ?? false,
    };
  }

  /**
   * Which events, if any, a batch of synced records should emit. Default:
   * customer syncs emit CONTACT_IMPORTED; other object syncs emit nothing (their
   * lifecycle events come from webhooks). Override per provider as needed.
   */
  protected eventsForSync(objectType: CanonicalObjectType, records: CanonicalRecord[]): PlatformEvent[] {
    if (objectType !== "customer") return [];
    return records.map((record) =>
      createEvent("CONTACT_IMPORTED", {
        companyId: this.companyId,
        provider: this.provider,
        source: "sync",
        customer: this.customerRef("customer", record),
        payload: { customer: record as CanonicalCustomer },
      })
    );
  }

  /** Refresh the access token if it's missing or within 60s of expiry. */
  protected async ensureFreshToken(): Promise<void> {
    if (!this.credentials) return;
    const tokens = await this.credentials.load();
    if (!tokens) return;
    const expMs = tokens.expiresAt ? new Date(tokens.expiresAt).getTime() : Infinity;
    if (expMs - this.now().getTime() >= 60_000) return;

    try {
      // Retry the refresh; log each attempt.
      const refreshed = await this.execute("token.refresh", () => this.refreshToken());
      await this.credentials.save(refreshed);
    } catch (err) {
      // Refresh permanently failed → the connection needs re-authentication.
      await this.onAuthExpired(errText(err));
      throw err;
    }
  }

  /** Mark the connection in error and notify the user that re-auth is needed. */
  protected async onAuthExpired(reason: string): Promise<void> {
    await this.logger?.log({ level: "error", action: "auth.expired", message: reason });
    await this.state?.markStatus("error", `Authentication expired: ${reason}`);
    await this.state?.notifyAuthExpired(reason);
  }

  /** Assemble a typed platform event from a normalized record. */
  protected buildEvent(
    eventType: PlatformEventType,
    objectType: CanonicalObjectType,
    record: CanonicalRecord,
    source: "webhook" | "sync" | "api"
  ): PlatformEvent {
    // eventType/objectType are runtime values, so the payload can't be narrowed
    // to the exact union member by the type system; the wrapper is correct by
    // construction and cast to the union.
    return createEvent(eventType as "CUSTOMER_CREATED", {
      companyId: this.companyId,
      provider: this.provider,
      source,
      customer: this.customerRef(objectType, record),
      payload: wrapPayload(objectType, record) as EventPayloadMap["CUSTOMER_CREATED"],
    }) as PlatformEvent;
  }

  /** Extract a lightweight customer reference from any canonical record. */
  protected customerRef(objectType: CanonicalObjectType, record: CanonicalRecord): EventCustomerRef | null {
    if (objectType === "customer") {
      const c = record as CanonicalCustomer;
      return {
        id: c.id ?? null,
        externalId: c.externalId,
        displayName: c.displayName,
        email: c.emails?.[0] ?? null,
        phone: c.phones?.[0]?.value ?? null,
      };
    }
    const ref = record as { customerExternalId?: string | null };
    return ref.customerExternalId ? { externalId: ref.customerExternalId } : null;
  }
}

function errText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Wrap a normalized record into the payload shape for its object's events.
function wrapPayload(objectType: CanonicalObjectType, record: CanonicalRecord): EventPayloadMap[PlatformEventType] {
  switch (objectType) {
    case "job":
      return { job: record as CanonicalJob };
    case "invoice":
      return { invoice: record as CanonicalInvoice };
    case "estimate":
      return { estimate: record as CanonicalEstimate };
    case "appointment":
      return { appointment: record as CanonicalAppointment };
    case "customer":
    default:
      return { customer: record as CanonicalCustomer };
  }
}
