// =============================================================================
// Canonical CRM — normalization helpers. Small, dependency-free utilities that
// adapters use to build well-formed canonical objects. Pure functions only.
// =============================================================================

import type { Money, PersonName, Address, JobStatus, InvoiceStatus, EstimateStatus, AppointmentStatus } from "@/lib/crm/models";

export const DEFAULT_CURRENCY = "USD";

// ------------------------------------------------------------------- money
/** Money from integer minor units (cents). */
export function money(amount: number, currency = DEFAULT_CURRENCY): Money {
  return { amount: Math.round(amount) || 0, currency };
}

/** Money from a decimal dollar amount (12.34 → { amount: 1234 }). */
export function usd(dollars: number, currency = DEFAULT_CURRENCY): Money {
  return { amount: Math.round((dollars || 0) * 100), currency };
}

/** Parse a possibly-dirty money string/number ("$1,234.50") into Money. */
export function parseMoney(input: string | number | null | undefined, currency = DEFAULT_CURRENCY): Money {
  if (input == null) return money(0, currency);
  if (typeof input === "number") return usd(input, currency);
  const cleaned = input.replace(/[^0-9.-]/g, "");
  const value = parseFloat(cleaned);
  return usd(Number.isFinite(value) ? value : 0, currency);
}

export function addMoney(a: Money, b: Money): Money {
  return { amount: a.amount + b.amount, currency: a.currency || b.currency || DEFAULT_CURRENCY };
}

export function zeroMoney(currency = DEFAULT_CURRENCY): Money {
  return { amount: 0, currency };
}

/** Format Money for display ("$1,234.50"). */
export function formatMoney(m: Money): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: m.currency || DEFAULT_CURRENCY }).format(
    m.amount / 100
  );
}

// ------------------------------------------------------------------- names
export function personName(first?: string | null, last?: string | null, fallback?: string | null): PersonName {
  const full = [first, last].filter(Boolean).join(" ").trim() || (fallback ?? "").trim();
  return { first: first ?? null, last: last ?? null, full };
}

/** Split a single full-name string into a PersonName. */
export function splitName(full?: string | null): PersonName {
  const trimmed = (full ?? "").trim();
  if (!trimmed) return { first: null, last: null, full: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: null, full: trimmed };
  return { first: parts[0], last: parts.slice(1).join(" "), full: trimmed };
}

// ------------------------------------------------------------------- addresses
export function address(input: Partial<Address>): Address {
  return {
    line1: input.line1 ?? null,
    line2: input.line2 ?? null,
    city: input.city ?? null,
    region: input.region ?? null,
    postalCode: input.postalCode ?? null,
    country: input.country ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  };
}

// ------------------------------------------------------------------- misc
/** Coerce a value to an ISO-8601 string, or null. */
export function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value.toISOString();
  const d = new Date(value as string | number);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/** Normalize a US-style phone to E.164 where possible, else return as-is. */
export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw;
}

// ------------------------------------------------------------------- status mapping
/**
 * Map an arbitrary provider status string to a canonical value using a lookup
 * table of substrings. Falls back to "unknown". Case-insensitive.
 */
export function mapStatus<T extends string>(raw: string | null | undefined, table: Record<string, T>, fallback: T): T {
  const key = (raw ?? "").toLowerCase().trim();
  if (key in table) return table[key];
  // substring match (providers love "job_completed", "COMPLETE", etc.)
  for (const [needle, value] of Object.entries(table)) {
    if (key.includes(needle)) return value;
  }
  return fallback;
}

// Sensible default status vocabularies adapters can extend or override.
export const JOB_STATUS_TABLE: Record<string, JobStatus> = {
  lead: "lead",
  new: "lead",
  scheduled: "scheduled",
  booked: "scheduled",
  active: "in_progress",
  in_progress: "in_progress",
  started: "in_progress",
  hold: "on_hold",
  on_hold: "on_hold",
  complete: "completed",
  completed: "completed",
  won: "completed",
  closed: "completed",
  cancel: "canceled",
  canceled: "canceled",
  cancelled: "canceled",
  lost: "canceled",
};

export const INVOICE_STATUS_TABLE: Record<string, InvoiceStatus> = {
  draft: "draft",
  open: "sent",
  sent: "sent",
  partial: "partial",
  partially_paid: "partial",
  paid: "paid",
  overdue: "overdue",
  past_due: "overdue",
  void: "void",
  voided: "void",
};

export const ESTIMATE_STATUS_TABLE: Record<string, EstimateStatus> = {
  draft: "draft",
  sent: "sent",
  pending: "sent",
  viewed: "viewed",
  approved: "approved",
  accepted: "approved",
  rejected: "rejected",
  declined: "rejected",
  expired: "expired",
  converted: "converted",
};

export const APPOINTMENT_STATUS_TABLE: Record<string, AppointmentStatus> = {
  scheduled: "scheduled",
  confirmed: "confirmed",
  in_progress: "in_progress",
  arrived: "in_progress",
  complete: "completed",
  completed: "completed",
  cancel: "canceled",
  canceled: "canceled",
  cancelled: "canceled",
  no_show: "no_show",
  noshow: "no_show",
};
