// =============================================================================
// Reference adapter — ServiceTitan (CRM data mapping).
//
// Pure mapping from ServiceTitan's record shapes into the canonical model. No
// network code. Reuses the same contract and helpers as the other providers;
// only the ServiceTitan-specific field translation lives here.
//
// ServiceTitan differences captured in isolation:
//   - Monetary fields are decimal dollars (not cents) → usd()
//   - PascalCase status values (e.g. "InProgress") → ST-local status tables
// =============================================================================

import type {
  CanonicalCustomer,
  CanonicalJob,
  CanonicalInvoice,
  CanonicalEstimate,
  CanonicalAppointment,
  LineItem,
  JobStatus,
  InvoiceStatus,
  EstimateStatus,
  AppointmentStatus,
} from "@/lib/crm/models";
import type { CrmProviderAdapter, MappingContext } from "@/lib/crm/provider";
import { usd, personName, address, toIso, normalizePhone, mapStatus, DEFAULT_CURRENCY } from "@/lib/crm/helpers";

// ServiceTitan-local status vocabularies (keys are lowercased by mapStatus).
const ST_JOB_STATUS: Record<string, JobStatus> = {
  scheduled: "scheduled",
  dispatched: "scheduled",
  inprogress: "in_progress",
  working: "in_progress",
  hold: "on_hold",
  completed: "completed",
  complete: "completed",
  canceled: "canceled",
  cancelled: "canceled",
};
const ST_INVOICE_STATUS: Record<string, InvoiceStatus> = {
  pending: "draft",
  open: "sent",
  posted: "sent",
  partial: "partial",
  paid: "paid",
  void: "void",
};
const ST_ESTIMATE_STATUS: Record<string, EstimateStatus> = {
  open: "sent",
  sold: "approved",
  dismissed: "rejected",
  expired: "expired",
};
const ST_APPT_STATUS: Record<string, AppointmentStatus> = {
  scheduled: "scheduled",
  dispatched: "confirmed",
  working: "in_progress",
  done: "completed",
  completed: "completed",
  canceled: "canceled",
};

// --- Illustrative raw shapes (subset) -------------------------------------
interface StAddress {
  street?: string;
  unit?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}
interface StCustomer {
  id: number | string;
  name?: string;
  type?: string; // "Residential" | "Commercial"
  email?: string;
  phoneNumbers?: { phoneNumber: string; type?: string }[];
  address?: StAddress;
  active?: boolean;
  createdOn?: string;
  modifiedOn?: string;
}
interface StLineItem {
  id?: number | string;
  description?: string;
  quantity?: number;
  price?: number; // dollars
  total?: number; // dollars
  taxable?: boolean;
}
interface StJob {
  id: number | string;
  customerId?: number | string;
  summary?: string;
  jobStatus?: string;
  jobType?: { name?: string };
  address?: StAddress;
  technicianIds?: (number | string)[];
  start?: string;
  end?: string;
  completedOn?: string;
  total?: number; // dollars
  createdOn?: string;
  modifiedOn?: string;
}
interface StInvoice {
  id: number | string;
  customerId?: number | string;
  jobId?: number | string;
  referenceNumber?: string;
  status?: string;
  invoiceDate?: string;
  dueDate?: string;
  paidOn?: string;
  items?: StLineItem[];
  subtotal?: number; // dollars
  tax?: number; // dollars
  total?: number; // dollars
  balance?: number; // dollars
  createdOn?: string;
  modifiedOn?: string;
}
interface StEstimate {
  id: number | string;
  customerId?: number | string;
  jobId?: number | string;
  name?: string;
  status?: string;
  createdOn?: string;
  soldOn?: string;
  items?: StLineItem[];
  subtotal?: number; // dollars
  tax?: number; // dollars
  total?: number; // dollars
  modifiedOn?: string;
}
interface StAppointment {
  id: number | string;
  jobId?: number | string;
  customerId?: number | string;
  start?: string;
  end?: string;
  status?: string;
  technicianIds?: (number | string)[];
}

// --- Helpers ---------------------------------------------------------------
function id(v: number | string | undefined | null): string {
  return v == null ? "" : String(v);
}
function ids(v?: (number | string)[]): string[] {
  return (v ?? []).map((x) => String(x));
}
function addr(a?: StAddress | null) {
  if (!a) return null;
  return address({ line1: a.street, line2: a.unit, city: a.city, region: a.state, postalCode: a.zip, country: a.country });
}
function lineItems(items?: StLineItem[]): LineItem[] {
  return (items ?? []).map((li) => ({
    description: li.description || "",
    quantity: li.quantity ?? 1,
    unitPrice: usd(li.price ?? 0),
    total: usd(li.total ?? (li.price ?? 0) * (li.quantity ?? 1)),
    taxable: li.taxable ?? false,
    externalId: li.id != null ? String(li.id) : null,
  }));
}

// --- Adapter ---------------------------------------------------------------
export const servicetitanAdapter: CrmProviderAdapter = {
  provider: "servicetitan",
  displayName: "ServiceTitan",

  toCustomer(raw: unknown, ctx: MappingContext): CanonicalCustomer {
    const c = raw as StCustomer;
    const isBusiness = (c.type ?? "").toLowerCase() === "commercial";
    return {
      object: "customer",
      companyId: ctx.companyId,
      provider: "servicetitan",
      externalId: id(c.id),
      displayName: c.name || "Unknown",
      name: personName(null, null, c.name),
      companyName: isBusiness ? c.name ?? null : null,
      emails: c.email ? [c.email] : [],
      phones: (c.phoneNumbers ?? []).map((p) => ({
        channel: (p.type ?? "").toLowerCase() === "mobile" ? ("mobile" as const) : ("phone" as const),
        value: normalizePhone(p.phoneNumber) ?? p.phoneNumber,
      })),
      addresses: c.address ? [addr(c.address)!] : [],
      billingAddress: null,
      status: c.active === false ? "inactive" : "active",
      tags: [],
      createdAt: toIso(c.createdOn),
      updatedAt: toIso(c.modifiedOn),
      raw,
    };
  },

  toJob(raw: unknown, ctx: MappingContext): CanonicalJob {
    const j = raw as StJob;
    return {
      object: "job",
      companyId: ctx.companyId,
      provider: "servicetitan",
      externalId: id(j.id),
      customerExternalId: j.customerId != null ? id(j.customerId) : null,
      title: j.jobType?.name ?? null,
      description: j.summary ?? null,
      status: mapStatus(j.jobStatus, ST_JOB_STATUS, "unknown"),
      jobType: j.jobType?.name ?? null,
      serviceAddress: addr(j.address),
      technicianExternalIds: ids(j.technicianIds),
      scheduledStart: toIso(j.start),
      scheduledEnd: toIso(j.end),
      completedAt: toIso(j.completedOn),
      total: j.total != null ? usd(j.total) : null,
      invoiceExternalIds: [],
      estimateExternalIds: [],
      tags: [],
      createdAt: toIso(j.createdOn),
      updatedAt: toIso(j.modifiedOn),
      raw,
    };
  },

  toInvoice(raw: unknown, ctx: MappingContext): CanonicalInvoice {
    const i = raw as StInvoice;
    const total = usd(i.total ?? 0);
    const balance = i.balance != null ? usd(i.balance) : usd((i.total ?? 0) - 0);
    return {
      object: "invoice",
      companyId: ctx.companyId,
      provider: "servicetitan",
      externalId: id(i.id),
      customerExternalId: i.customerId != null ? id(i.customerId) : null,
      jobExternalId: i.jobId != null ? id(i.jobId) : null,
      number: i.referenceNumber ?? null,
      status: mapStatus(i.status, ST_INVOICE_STATUS, "unknown"),
      issuedAt: toIso(i.invoiceDate),
      dueAt: toIso(i.dueDate),
      paidAt: toIso(i.paidOn),
      lineItems: lineItems(i.items),
      subtotal: usd(i.subtotal ?? 0),
      tax: usd(i.tax ?? 0),
      total,
      amountPaid: { amount: total.amount - balance.amount, currency: DEFAULT_CURRENCY },
      balance,
      createdAt: toIso(i.createdOn),
      updatedAt: toIso(i.modifiedOn),
      raw,
    };
  },

  toEstimate(raw: unknown, ctx: MappingContext): CanonicalEstimate {
    const e = raw as StEstimate;
    return {
      object: "estimate",
      companyId: ctx.companyId,
      provider: "servicetitan",
      externalId: id(e.id),
      customerExternalId: e.customerId != null ? id(e.customerId) : null,
      jobExternalId: e.jobId != null ? id(e.jobId) : null,
      number: e.name ?? null,
      status: mapStatus(e.status, ST_ESTIMATE_STATUS, "unknown"),
      issuedAt: toIso(e.createdOn),
      expiresAt: null,
      approvedAt: toIso(e.soldOn),
      lineItems: lineItems(e.items),
      subtotal: usd(e.subtotal ?? 0),
      tax: usd(e.tax ?? 0),
      total: usd(e.total ?? 0),
      convertedInvoiceExternalId: null,
      createdAt: toIso(e.createdOn),
      updatedAt: toIso(e.modifiedOn),
      raw,
    };
  },

  toAppointment(raw: unknown, ctx: MappingContext): CanonicalAppointment {
    const a = raw as StAppointment;
    return {
      object: "appointment",
      companyId: ctx.companyId,
      provider: "servicetitan",
      externalId: id(a.id),
      customerExternalId: a.customerId != null ? id(a.customerId) : null,
      jobExternalId: a.jobId != null ? id(a.jobId) : null,
      title: null,
      status: mapStatus(a.status, ST_APPT_STATUS, "scheduled"),
      start: toIso(a.start) ?? new Date(ctx.now?.() ?? new Date()).toISOString(),
      end: toIso(a.end),
      allDay: false,
      location: null,
      technicianExternalIds: ids(a.technicianIds),
      notes: null,
      raw,
    };
  },
};
