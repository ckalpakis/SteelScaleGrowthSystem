// =============================================================================
// Universal Contractor CRM — canonical data model.
//
// This is the INTERNAL STANDARD for the Steel Scale platform. Every external CRM
// (Jobber, Housecall Pro, ServiceTitan, JobNimbus, AccuLynx, QuickBooks, …) maps
// its own data into these seven standardized objects so the rest of the platform
// only ever deals with one shape:
//
//   Customer · Job · Invoice · Estimate · Appointment · Technician · Company
//
// Design rules:
//   - Provider-agnostic. Nothing here references a specific vendor's fields.
//   - Every object carries provenance (provider + externalId) and keeps the
//     original payload in `raw` so nothing is lost in translation.
//   - Statuses are normalized to small canonical unions; adapters translate
//     vendor strings into them (with 'unknown' as the safe fallback).
//   - Money is stored in integer minor units to avoid floating-point drift.
//   - Pure types + value objects only — no persistence, no network.
// =============================================================================

// ---------------------------------------------------------------- providers
export type CrmProvider =
  | "jobber"
  | "housecall_pro"
  | "servicetitan"
  | "jobnimbus"
  | "acculynx"
  | "quickbooks"
  | "manual";

// The seven standardized object types.
export type CanonicalObjectType =
  | "customer"
  | "job"
  | "invoice"
  | "estimate"
  | "appointment"
  | "technician"
  | "company";

// ---------------------------------------------------------------- value objects
/** Money in integer minor units (e.g. cents). Never a float dollar amount. */
export interface Money {
  /** Amount in the currency's smallest unit — 12345 = $123.45 for USD. */
  amount: number;
  /** ISO 4217 currency code. Defaults to "USD" across the platform. */
  currency: string;
}

export interface PersonName {
  first?: string | null;
  last?: string | null;
  /** Full display name. Always set; derived from first/last when needed. */
  full: string;
}

export interface Address {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  /** State / province / region. */
  region?: string | null;
  postalCode?: string | null;
  /** ISO country code or name. */
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export type ContactChannel = "email" | "phone" | "mobile" | "fax" | "other";

export interface ContactPoint {
  channel: ContactChannel;
  value: string;
  label?: string | null;
  isPrimary?: boolean;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: Money;
  total: Money;
  taxable?: boolean;
  /** Provider's line-item id, when available. */
  externalId?: string | null;
}

// ---------------------------------------------------------------- status enums
export type CustomerStatus = "active" | "inactive" | "lead" | "archived" | "unknown";

export type JobStatus =
  | "lead"
  | "scheduled"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "canceled"
  | "unknown";

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "partial"
  | "paid"
  | "overdue"
  | "void"
  | "unknown";

export type EstimateStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "approved"
  | "rejected"
  | "expired"
  | "converted"
  | "unknown";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "canceled"
  | "no_show"
  | "unknown";

// ---------------------------------------------------------------- base
/**
 * Fields every canonical object shares. Timestamps are ISO-8601 strings.
 * `externalId` + `provider` uniquely identify the source record; `id` is our own
 * internal id once the record is persisted (undefined before then).
 */
export interface CanonicalBase {
  object: CanonicalObjectType;
  /** Internal Steel Scale id (uuid) once persisted. */
  id?: string;
  /** The tenant this record belongs to (company_id). */
  companyId: string;
  /** Which external system this came from. */
  provider: CrmProvider;
  /** The id of this record in the provider's system. */
  externalId: string;
  /** When the provider says the record was created (ISO). */
  createdAt?: string | null;
  /** When the provider says the record was last updated (ISO). */
  updatedAt?: string | null;
  /** Free-form non-standard fields we still want to keep. */
  metadata?: Record<string, unknown>;
  /** The original provider payload, retained verbatim for debugging / re-mapping. */
  raw?: unknown;
}

// ---------------------------------------------------------------- Customer
export interface CanonicalCustomer extends CanonicalBase {
  object: "customer";
  /** Best display label (person or business name). Always set. */
  displayName: string;
  name?: PersonName | null;
  /** Set when the customer is a business rather than an individual. */
  companyName?: string | null;
  emails: string[];
  phones: ContactPoint[];
  addresses: Address[];
  billingAddress?: Address | null;
  status: CustomerStatus;
  tags: string[];
  notes?: string | null;
  lifetimeValue?: Money | null;
}

// ---------------------------------------------------------------- Job
export interface CanonicalJob extends CanonicalBase {
  object: "job";
  /** External id of the customer this job belongs to. */
  customerExternalId?: string | null;
  title?: string | null;
  description?: string | null;
  status: JobStatus;
  /** Trade / job type, e.g. "Roof Replacement". */
  jobType?: string | null;
  serviceAddress?: Address | null;
  /** External ids of technicians assigned to the job. */
  technicianExternalIds: string[];
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  completedAt?: string | null;
  total?: Money | null;
  invoiceExternalIds: string[];
  estimateExternalIds: string[];
  tags: string[];
  notes?: string | null;
}

// ---------------------------------------------------------------- Invoice
export interface CanonicalInvoice extends CanonicalBase {
  object: "invoice";
  customerExternalId?: string | null;
  jobExternalId?: string | null;
  /** Human-facing invoice number, e.g. "INV-1042". */
  number?: string | null;
  status: InvoiceStatus;
  issuedAt?: string | null;
  dueAt?: string | null;
  paidAt?: string | null;
  lineItems: LineItem[];
  subtotal: Money;
  tax: Money;
  total: Money;
  amountPaid: Money;
  balance: Money;
}

// ---------------------------------------------------------------- Estimate
export interface CanonicalEstimate extends CanonicalBase {
  object: "estimate";
  customerExternalId?: string | null;
  jobExternalId?: string | null;
  number?: string | null;
  status: EstimateStatus;
  issuedAt?: string | null;
  expiresAt?: string | null;
  approvedAt?: string | null;
  lineItems: LineItem[];
  subtotal: Money;
  tax: Money;
  total: Money;
  /** When converted, the external id of the resulting invoice. */
  convertedInvoiceExternalId?: string | null;
}

// ---------------------------------------------------------------- Appointment
export interface CanonicalAppointment extends CanonicalBase {
  object: "appointment";
  customerExternalId?: string | null;
  jobExternalId?: string | null;
  title?: string | null;
  status: AppointmentStatus;
  start: string;
  end?: string | null;
  allDay?: boolean;
  location?: Address | null;
  technicianExternalIds: string[];
  notes?: string | null;
}

// ---------------------------------------------------------------- Technician
export interface CanonicalTechnician extends CanonicalBase {
  object: "technician";
  name: PersonName;
  email?: string | null;
  phone?: string | null;
  /** Role / title, e.g. "Lead Installer". */
  role?: string | null;
  active: boolean;
}

// ---------------------------------------------------------------- Company
/** The contractor business / account as represented in the provider. */
export interface CanonicalCompany extends CanonicalBase {
  object: "company";
  name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: Address | null;
  timezone?: string | null;
  /** Trade / industry, e.g. "Roofing". */
  industry?: string | null;
}

// ---------------------------------------------------------------- unions
/** Any standardized record. Discriminated by the `object` field. */
export type CanonicalRecord =
  | CanonicalCustomer
  | CanonicalJob
  | CanonicalInvoice
  | CanonicalEstimate
  | CanonicalAppointment
  | CanonicalTechnician
  | CanonicalCompany;

/** Maps a CanonicalObjectType to its concrete interface. */
export interface CanonicalObjectMap {
  customer: CanonicalCustomer;
  job: CanonicalJob;
  invoice: CanonicalInvoice;
  estimate: CanonicalEstimate;
  appointment: CanonicalAppointment;
  technician: CanonicalTechnician;
  company: CanonicalCompany;
}
