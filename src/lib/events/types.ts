// =============================================================================
// Internal event system — types.
//
// A single, provider-agnostic vocabulary of domain events for the Steel Scale
// platform. Integrations, the CRM sync layer, and internal flows all emit these
// same events; feature modules (reputation, automations, …) subscribe. Nothing
// here — or in the bus — branches on a specific provider; the provider is just a
// metadata field on the envelope.
//
// Every event shares one envelope: Company ID, Provider, Timestamp, Payload,
// Customer, Source.
// =============================================================================

import type {
  CrmProvider,
  Money,
  CanonicalCustomer,
  CanonicalJob,
  CanonicalInvoice,
  CanonicalEstimate,
  CanonicalAppointment,
} from "@/lib/crm/models";

// ---------------------------------------------------------------- event types
export type PlatformEventType =
  | "CUSTOMER_CREATED"
  | "CUSTOMER_UPDATED"
  | "JOB_CREATED"
  | "JOB_SCHEDULED"
  | "JOB_STARTED"
  | "JOB_COMPLETED"
  | "ESTIMATE_ACCEPTED"
  | "ESTIMATE_DECLINED"
  | "INVOICE_CREATED"
  | "INVOICE_PAID"
  | "PAYMENT_RECEIVED"
  | "APPOINTMENT_COMPLETED"
  | "CONTACT_IMPORTED";

/** Ordered list of every supported event type (for iteration / validation). */
export const PLATFORM_EVENT_TYPES: readonly PlatformEventType[] = [
  "CUSTOMER_CREATED",
  "CUSTOMER_UPDATED",
  "JOB_CREATED",
  "JOB_SCHEDULED",
  "JOB_STARTED",
  "JOB_COMPLETED",
  "ESTIMATE_ACCEPTED",
  "ESTIMATE_DECLINED",
  "INVOICE_CREATED",
  "INVOICE_PAID",
  "PAYMENT_RECEIVED",
  "APPOINTMENT_COMPLETED",
  "CONTACT_IMPORTED",
] as const;

export function isPlatformEventType(value: string): value is PlatformEventType {
  return (PLATFORM_EVENT_TYPES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------- envelope bits
/** Where the platform sees an event coming from. Includes internal origination. */
export type EventProvider = CrmProvider | "internal";

/** How the event was produced. */
export type EventSource = "webhook" | "sync" | "api" | "manual" | "import" | "system";

/** Lightweight customer reference carried on every event for quick routing. */
export interface EventCustomerRef {
  /** Internal canonical customer id, if known. */
  id?: string | null;
  /** Provider-side customer id. */
  externalId?: string | null;
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
}

// ---------------------------------------------------------------- payloads
export interface PaymentReceivedPayload {
  invoiceExternalId?: string | null;
  amount: Money;
  method?: string | null;
  paidAt: string;
  reference?: string | null;
}

export interface ContactImportedPayload {
  customer: CanonicalCustomer;
  /** Groups contacts imported together in one batch. */
  batchId?: string | null;
}

/** Maps each event type to its payload shape. */
export interface EventPayloadMap {
  CUSTOMER_CREATED: { customer: CanonicalCustomer };
  CUSTOMER_UPDATED: { customer: CanonicalCustomer };
  JOB_CREATED: { job: CanonicalJob };
  JOB_SCHEDULED: { job: CanonicalJob };
  JOB_STARTED: { job: CanonicalJob };
  JOB_COMPLETED: { job: CanonicalJob };
  ESTIMATE_ACCEPTED: { estimate: CanonicalEstimate };
  ESTIMATE_DECLINED: { estimate: CanonicalEstimate };
  INVOICE_CREATED: { invoice: CanonicalInvoice };
  INVOICE_PAID: { invoice: CanonicalInvoice };
  PAYMENT_RECEIVED: PaymentReceivedPayload;
  APPOINTMENT_COMPLETED: { appointment: CanonicalAppointment };
  CONTACT_IMPORTED: ContactImportedPayload;
}

// ---------------------------------------------------------------- envelope
export const EVENT_SCHEMA_VERSION = 1;

/** The fields shared by every event, regardless of type. */
export interface EventEnvelope {
  /** Unique event id (uuid). */
  id: string;
  type: PlatformEventType;
  /** Tenant the event belongs to. */
  companyId: string;
  /** Which system the data came from (or "internal"). */
  provider: EventProvider;
  /** How the event was produced. */
  source: EventSource;
  /** When the underlying thing happened (ISO-8601). */
  occurredAt: string;
  /** When the platform created this envelope (ISO-8601). */
  receivedAt: string;
  /** Customer this event concerns, if any. */
  customer: EventCustomerRef | null;
  /** Optional id to correlate related events (e.g. one sync run). */
  correlationId?: string | null;
  /** Optional idempotency key to suppress duplicate delivery. */
  dedupeKey?: string | null;
  /** Envelope schema version. */
  version: number;
}

/** A fully-typed event: envelope + the payload for its specific type. */
export type PlatformEventOf<K extends PlatformEventType> = EventEnvelope & {
  type: K;
  payload: EventPayloadMap[K];
};

/** The discriminated union of every possible event. */
export type PlatformEvent = {
  [K in PlatformEventType]: PlatformEventOf<K>;
}[PlatformEventType];
