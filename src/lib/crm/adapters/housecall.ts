// =============================================================================
// Reference adapter — Housecall Pro (CRM data mapping).
//
// Pure mapping functions from Housecall Pro's record shapes into the canonical
// model. No network code. Same contract and helpers as the Jobber mapper — this
// only adds the HCP-specific field translation, nothing architectural.
//
// The `Hcp*` raw shapes are an illustrative subset; full payloads still pass
// through unchanged as `raw`.
// =============================================================================

import type {
  CanonicalCustomer,
  CanonicalJob,
  CanonicalInvoice,
  CanonicalAppointment,
  LineItem,
} from "@/lib/crm/models";
import type { CrmProviderAdapter, MappingContext } from "@/lib/crm/provider";
import {
  money,
  personName,
  address,
  toIso,
  normalizePhone,
  mapStatus,
  JOB_STATUS_TABLE,
  INVOICE_STATUS_TABLE,
  APPOINTMENT_STATUS_TABLE,
  DEFAULT_CURRENCY,
} from "@/lib/crm/helpers";

// --- Illustrative raw shapes (subset) -------------------------------------
interface HcpAddress {
  street?: string;
  street_line_2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}
interface HcpCustomer {
  id: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  email?: string;
  mobile_number?: string;
  home_number?: string;
  addresses?: HcpAddress[];
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}
interface HcpLineItem {
  id?: string;
  name?: string;
  description?: string;
  quantity?: number;
  unit_price?: number; // cents
  amount?: number; // cents
  taxable?: boolean;
}
interface HcpJob {
  id: string;
  customer_id?: string;
  description?: string;
  work_status?: string;
  job_type?: string;
  address?: HcpAddress;
  assigned_employees?: { id: string }[];
  schedule?: { scheduled_start?: string; scheduled_end?: string };
  completed_at?: string;
  total_amount?: number; // cents
  created_at?: string;
  updated_at?: string;
}
interface HcpInvoice {
  id: string;
  customer_id?: string;
  job_id?: string;
  invoice_number?: string;
  status?: string;
  sent_at?: string;
  due_at?: string;
  paid_at?: string;
  line_items?: HcpLineItem[];
  subtotal?: number; // cents
  tax_amount?: number; // cents
  amount?: number; // cents
  amount_paid?: number; // cents
  created_at?: string;
  updated_at?: string;
}
interface HcpAppointment {
  id: string;
  customer_id?: string;
  job_id?: string;
  start_time?: string;
  end_time?: string;
  status?: string;
  address?: HcpAddress;
  dispatched_employees?: { id: string }[];
  notes?: string;
}

// --- Helpers ---------------------------------------------------------------
function addr(a?: HcpAddress | null) {
  if (!a) return null;
  return address({
    line1: a.street,
    line2: a.street_line_2,
    city: a.city,
    region: a.state,
    postalCode: a.zip,
    country: a.country,
  });
}

// HCP monetary fields are integer cents.
function lineItems(items?: HcpLineItem[]): LineItem[] {
  return (items ?? []).map((li) => ({
    description: li.description || li.name || "",
    quantity: li.quantity ?? 1,
    unitPrice: money(li.unit_price ?? 0),
    total: money(li.amount ?? (li.unit_price ?? 0) * (li.quantity ?? 1)),
    taxable: li.taxable ?? false,
    externalId: li.id ?? null,
  }));
}

// --- Adapter ---------------------------------------------------------------
export const housecallAdapter: CrmProviderAdapter = {
  provider: "housecall_pro",
  displayName: "Housecall Pro",

  toCustomer(raw: unknown, ctx: MappingContext): CanonicalCustomer {
    const c = raw as HcpCustomer;
    const phones = [
      c.mobile_number ? { channel: "mobile" as const, value: normalizePhone(c.mobile_number)!, isPrimary: true } : null,
      c.home_number ? { channel: "phone" as const, value: normalizePhone(c.home_number)!, isPrimary: false } : null,
    ].filter((p): p is NonNullable<typeof p> => !!p);

    return {
      object: "customer",
      companyId: ctx.companyId,
      provider: "housecall_pro",
      externalId: c.id,
      displayName: c.company || personName(c.first_name, c.last_name).full || "Unknown",
      name: personName(c.first_name, c.last_name, c.company),
      companyName: c.company ?? null,
      emails: c.email ? [c.email] : [],
      phones,
      addresses: (c.addresses ?? []).map((a) => addr(a)).filter((a): a is NonNullable<typeof a> => !!a),
      billingAddress: null,
      status: "active",
      tags: c.tags ?? [],
      createdAt: toIso(c.created_at),
      updatedAt: toIso(c.updated_at),
      raw,
    };
  },

  toJob(raw: unknown, ctx: MappingContext): CanonicalJob {
    const j = raw as HcpJob;
    return {
      object: "job",
      companyId: ctx.companyId,
      provider: "housecall_pro",
      externalId: j.id,
      customerExternalId: j.customer_id ?? null,
      title: j.description ?? null,
      description: j.description ?? null,
      // HCP uses "in progress" (space) — normalize to the table's key form.
      status: mapStatus((j.work_status ?? "").replace(/\s+/g, "_"), JOB_STATUS_TABLE, "unknown"),
      jobType: j.job_type ?? null,
      serviceAddress: addr(j.address),
      technicianExternalIds: (j.assigned_employees ?? []).map((e) => e.id),
      scheduledStart: toIso(j.schedule?.scheduled_start),
      scheduledEnd: toIso(j.schedule?.scheduled_end),
      completedAt: toIso(j.completed_at),
      total: j.total_amount != null ? money(j.total_amount) : null,
      invoiceExternalIds: [],
      estimateExternalIds: [],
      tags: [],
      createdAt: toIso(j.created_at),
      updatedAt: toIso(j.updated_at),
      raw,
    };
  },

  toInvoice(raw: unknown, ctx: MappingContext): CanonicalInvoice {
    const i = raw as HcpInvoice;
    const total = money(i.amount ?? 0);
    const paid = money(i.amount_paid ?? 0);
    return {
      object: "invoice",
      companyId: ctx.companyId,
      provider: "housecall_pro",
      externalId: i.id,
      customerExternalId: i.customer_id ?? null,
      jobExternalId: i.job_id ?? null,
      number: i.invoice_number ?? null,
      status: mapStatus(i.status, INVOICE_STATUS_TABLE, "unknown"),
      issuedAt: toIso(i.sent_at),
      dueAt: toIso(i.due_at),
      paidAt: toIso(i.paid_at),
      lineItems: lineItems(i.line_items),
      subtotal: money(i.subtotal ?? 0),
      tax: money(i.tax_amount ?? 0),
      total,
      amountPaid: paid,
      balance: money(total.amount - paid.amount, DEFAULT_CURRENCY),
      createdAt: toIso(i.created_at),
      updatedAt: toIso(i.updated_at),
      raw,
    };
  },

  toAppointment(raw: unknown, ctx: MappingContext): CanonicalAppointment {
    const a = raw as HcpAppointment;
    return {
      object: "appointment",
      companyId: ctx.companyId,
      provider: "housecall_pro",
      externalId: a.id,
      customerExternalId: a.customer_id ?? null,
      jobExternalId: a.job_id ?? null,
      title: null,
      status: mapStatus(a.status, APPOINTMENT_STATUS_TABLE, "scheduled"),
      start: toIso(a.start_time) ?? new Date(ctx.now?.() ?? new Date()).toISOString(),
      end: toIso(a.end_time),
      allDay: false,
      location: addr(a.address),
      technicianExternalIds: (a.dispatched_employees ?? []).map((e) => e.id),
      notes: a.notes ?? null,
      raw,
    };
  },
};
