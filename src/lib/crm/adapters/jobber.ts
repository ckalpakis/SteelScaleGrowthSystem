// =============================================================================
// Reference adapter — Jobber.
//
// A REFERENCE IMPLEMENTATION of the CrmProviderAdapter contract, showing how a
// provider's records translate into the canonical model. These are pure mapping
// functions over already-fetched data — there is NO API/network code here. Use
// this as the template when onboarding a new provider.
//
// The `Jobber*` raw shapes below are illustrative (a trimmed subset of Jobber's
// fields); real payloads should still be passed through unchanged as `raw`.
// =============================================================================

import type {
  CanonicalCustomer,
  CanonicalJob,
  CanonicalInvoice,
  CanonicalEstimate,
  CanonicalAppointment,
  CanonicalTechnician,
  CanonicalCompany,
  LineItem,
} from "@/lib/crm/models";
import type { CrmProviderAdapter, MappingContext } from "@/lib/crm/provider";
import {
  money,
  usd,
  parseMoney,
  personName,
  splitName,
  address,
  toIso,
  normalizePhone,
  mapStatus,
  JOB_STATUS_TABLE,
  INVOICE_STATUS_TABLE,
  ESTIMATE_STATUS_TABLE,
  APPOINTMENT_STATUS_TABLE,
  DEFAULT_CURRENCY,
} from "@/lib/crm/helpers";

// --- Illustrative raw shapes (subset) -------------------------------------
interface JobberAddress {
  street1?: string;
  street2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
}
interface JobberClient {
  id: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  emails?: { address: string }[];
  phones?: { number: string; primary?: boolean }[];
  billingAddress?: JobberAddress;
  properties?: { address?: JobberAddress }[];
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}
interface JobberLineItem {
  id?: string;
  name?: string;
  description?: string;
  quantity?: number;
  unitCost?: number;
  totalCost?: number;
  taxable?: boolean;
}
interface JobberJob {
  id: string;
  clientId?: string;
  title?: string;
  instructions?: string;
  jobStatus?: string;
  jobType?: string;
  property?: { address?: JobberAddress };
  assignedUsers?: { id: string }[];
  startAt?: string;
  endAt?: string;
  completedAt?: string;
  total?: number;
  createdAt?: string;
  updatedAt?: string;
}
interface JobberInvoice {
  id: string;
  clientId?: string;
  jobId?: string;
  invoiceNumber?: string;
  status?: string;
  issuedDate?: string;
  dueDate?: string;
  paidAt?: string;
  lineItems?: JobberLineItem[];
  subtotal?: number;
  taxAmount?: number;
  total?: number;
  amountPaid?: number;
  createdAt?: string;
  updatedAt?: string;
}
interface JobberQuote {
  id: string;
  clientId?: string;
  jobId?: string;
  quoteNumber?: string;
  status?: string;
  createdAt?: string;
  expiryDate?: string;
  approvedAt?: string;
  lineItems?: JobberLineItem[];
  subtotal?: number;
  taxAmount?: number;
  total?: number;
  convertedInvoiceId?: string;
  updatedAt?: string;
}
interface JobberVisit {
  id: string;
  clientId?: string;
  jobId?: string;
  title?: string;
  status?: string;
  startAt?: string;
  endAt?: string;
  allDay?: boolean;
  property?: { address?: JobberAddress };
  assignedUsers?: { id: string }[];
  notes?: string;
}
interface JobberUser {
  id: string;
  name?: { first?: string; last?: string; full?: string };
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
}
interface JobberAccount {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: JobberAddress;
  timezone?: string;
  industry?: string;
}

// --- Helpers ---------------------------------------------------------------
function addr(a?: JobberAddress | null) {
  if (!a) return null;
  return address({
    line1: a.street1,
    line2: a.street2,
    city: a.city,
    region: a.province,
    postalCode: a.postalCode,
    country: a.country,
  });
}

function lineItems(items?: JobberLineItem[]): LineItem[] {
  return (items ?? []).map((li) => ({
    description: li.description || li.name || "",
    quantity: li.quantity ?? 1,
    unitPrice: usd(li.unitCost ?? 0),
    total: usd(li.totalCost ?? (li.unitCost ?? 0) * (li.quantity ?? 1)),
    taxable: li.taxable ?? false,
    externalId: li.id ?? null,
  }));
}

// --- Adapter ---------------------------------------------------------------
export const jobberAdapter: CrmProviderAdapter = {
  provider: "jobber",
  displayName: "Jobber",

  toCustomer(raw: unknown, ctx: MappingContext): CanonicalCustomer {
    const c = raw as JobberClient;
    return {
      object: "customer",
      companyId: ctx.companyId,
      provider: "jobber",
      externalId: c.id,
      displayName: c.companyName || personName(c.firstName, c.lastName).full || "Unknown",
      name: personName(c.firstName, c.lastName, c.companyName),
      companyName: c.companyName ?? null,
      emails: (c.emails ?? []).map((e) => e.address).filter(Boolean),
      phones: (c.phones ?? []).map((p) => ({
        channel: "phone" as const,
        value: normalizePhone(p.number) ?? p.number,
        isPrimary: p.primary ?? false,
      })),
      addresses: (c.properties ?? []).map((p) => addr(p.address)).filter((a): a is NonNullable<typeof a> => !!a),
      billingAddress: addr(c.billingAddress),
      status: "active",
      tags: c.tags ?? [],
      createdAt: toIso(c.createdAt),
      updatedAt: toIso(c.updatedAt),
      raw,
    };
  },

  toJob(raw: unknown, ctx: MappingContext): CanonicalJob {
    const j = raw as JobberJob;
    return {
      object: "job",
      companyId: ctx.companyId,
      provider: "jobber",
      externalId: j.id,
      customerExternalId: j.clientId ?? null,
      title: j.title ?? null,
      description: j.instructions ?? null,
      status: mapStatus(j.jobStatus, JOB_STATUS_TABLE, "unknown"),
      jobType: j.jobType ?? null,
      serviceAddress: addr(j.property?.address),
      technicianExternalIds: (j.assignedUsers ?? []).map((u) => u.id),
      scheduledStart: toIso(j.startAt),
      scheduledEnd: toIso(j.endAt),
      completedAt: toIso(j.completedAt),
      total: j.total != null ? usd(j.total) : null,
      invoiceExternalIds: [],
      estimateExternalIds: [],
      tags: [],
      createdAt: toIso(j.createdAt),
      updatedAt: toIso(j.updatedAt),
      raw,
    };
  },

  toInvoice(raw: unknown, ctx: MappingContext): CanonicalInvoice {
    const i = raw as JobberInvoice;
    const total = usd(i.total ?? 0);
    const paid = usd(i.amountPaid ?? 0);
    return {
      object: "invoice",
      companyId: ctx.companyId,
      provider: "jobber",
      externalId: i.id,
      customerExternalId: i.clientId ?? null,
      jobExternalId: i.jobId ?? null,
      number: i.invoiceNumber ?? null,
      status: mapStatus(i.status, INVOICE_STATUS_TABLE, "unknown"),
      issuedAt: toIso(i.issuedDate),
      dueAt: toIso(i.dueDate),
      paidAt: toIso(i.paidAt),
      lineItems: lineItems(i.lineItems),
      subtotal: usd(i.subtotal ?? 0),
      tax: usd(i.taxAmount ?? 0),
      total,
      amountPaid: paid,
      balance: money(total.amount - paid.amount, DEFAULT_CURRENCY),
      createdAt: toIso(i.createdAt),
      updatedAt: toIso(i.updatedAt),
      raw,
    };
  },

  toEstimate(raw: unknown, ctx: MappingContext): CanonicalEstimate {
    const q = raw as JobberQuote;
    return {
      object: "estimate",
      companyId: ctx.companyId,
      provider: "jobber",
      externalId: q.id,
      customerExternalId: q.clientId ?? null,
      jobExternalId: q.jobId ?? null,
      number: q.quoteNumber ?? null,
      status: mapStatus(q.status, ESTIMATE_STATUS_TABLE, "unknown"),
      issuedAt: toIso(q.createdAt),
      expiresAt: toIso(q.expiryDate),
      approvedAt: toIso(q.approvedAt),
      lineItems: lineItems(q.lineItems),
      subtotal: usd(q.subtotal ?? 0),
      tax: usd(q.taxAmount ?? 0),
      total: usd(q.total ?? 0),
      convertedInvoiceExternalId: q.convertedInvoiceId ?? null,
      createdAt: toIso(q.createdAt),
      updatedAt: toIso(q.updatedAt),
      raw,
    };
  },

  toAppointment(raw: unknown, ctx: MappingContext): CanonicalAppointment {
    const v = raw as JobberVisit;
    return {
      object: "appointment",
      companyId: ctx.companyId,
      provider: "jobber",
      externalId: v.id,
      customerExternalId: v.clientId ?? null,
      jobExternalId: v.jobId ?? null,
      title: v.title ?? null,
      status: mapStatus(v.status, APPOINTMENT_STATUS_TABLE, "scheduled"),
      start: toIso(v.startAt) ?? new Date((ctx.now?.() ?? new Date())).toISOString(),
      end: toIso(v.endAt),
      allDay: v.allDay ?? false,
      location: addr(v.property?.address),
      technicianExternalIds: (v.assignedUsers ?? []).map((u) => u.id),
      notes: v.notes ?? null,
      raw,
    };
  },

  toTechnician(raw: unknown, ctx: MappingContext): CanonicalTechnician {
    const u = raw as JobberUser;
    const name = u.name?.full ? splitName(u.name.full) : personName(u.name?.first, u.name?.last);
    return {
      object: "technician",
      companyId: ctx.companyId,
      provider: "jobber",
      externalId: u.id,
      name,
      email: u.email ?? null,
      phone: normalizePhone(u.phone),
      role: u.role ?? null,
      active: (u.status ?? "active").toLowerCase() === "active",
      raw,
    };
  },

  toCompany(raw: unknown, ctx: MappingContext): CanonicalCompany {
    const a = raw as JobberAccount;
    return {
      object: "company",
      companyId: ctx.companyId,
      provider: "jobber",
      externalId: a.id,
      name: a.name || "Unknown",
      email: a.email ?? null,
      phone: normalizePhone(a.phone),
      website: a.website ?? null,
      address: addr(a.address),
      timezone: a.timezone ?? null,
      industry: a.industry ?? null,
      raw,
    };
  },
};
