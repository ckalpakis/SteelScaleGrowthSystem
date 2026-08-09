// =============================================================================
// Canonical CRM — provider adapter contract + registry.
//
// Every external CRM implements a CrmProviderAdapter: a set of PURE mapping
// functions that convert the provider's own record shapes into the canonical
// objects in models.ts. No network calls live here — an adapter only transforms
// data that some other layer has already fetched. That keeps mapping logic
// testable in isolation and lets the fetching/syncing layer evolve separately.
// =============================================================================

import type {
  CrmProvider,
  CanonicalObjectType,
  CanonicalObjectMap,
  CanonicalCustomer,
  CanonicalJob,
  CanonicalInvoice,
  CanonicalEstimate,
  CanonicalAppointment,
  CanonicalTechnician,
  CanonicalCompany,
} from "@/lib/crm/models";

/** Context threaded into every mapping call. */
export interface MappingContext {
  /** The tenant the resulting canonical records belong to. */
  companyId: string;
  provider: CrmProvider;
  /** Clock injection for deterministic tests. Defaults to () => new Date(). */
  now?: () => Date;
}

/** A single mapping function: raw provider record → canonical object. */
export type CrmMapper<TCanonical> = (raw: unknown, ctx: MappingContext) => TCanonical;

/**
 * The adapter each provider implements. Methods are optional so a provider can
 * be onboarded incrementally (e.g. QuickBooks maps invoices/estimates but not
 * jobs). A method being present is the contract that the provider supports that
 * object type.
 */
export interface CrmProviderAdapter {
  provider: CrmProvider;
  displayName: string;

  toCustomer?: CrmMapper<CanonicalCustomer>;
  toJob?: CrmMapper<CanonicalJob>;
  toInvoice?: CrmMapper<CanonicalInvoice>;
  toEstimate?: CrmMapper<CanonicalEstimate>;
  toAppointment?: CrmMapper<CanonicalAppointment>;
  toTechnician?: CrmMapper<CanonicalTechnician>;
  toCompany?: CrmMapper<CanonicalCompany>;
}

// Map an object type to the adapter method that produces it.
const METHOD_FOR: Record<CanonicalObjectType, keyof CrmProviderAdapter> = {
  customer: "toCustomer",
  job: "toJob",
  invoice: "toInvoice",
  estimate: "toEstimate",
  appointment: "toAppointment",
  technician: "toTechnician",
  company: "toCompany",
};

/** Object types a given adapter can currently map. */
export function supportedObjects(adapter: CrmProviderAdapter): CanonicalObjectType[] {
  return (Object.keys(METHOD_FOR) as CanonicalObjectType[]).filter((t) => typeof adapter[METHOD_FOR[t]] === "function");
}

/**
 * Generic dispatch: map a single raw record of a known object type through an
 * adapter. Throws if the adapter doesn't support that object type.
 */
export function mapRecord<T extends CanonicalObjectType>(
  adapter: CrmProviderAdapter,
  objectType: T,
  raw: unknown,
  ctx: MappingContext
): CanonicalObjectMap[T] {
  const fn = adapter[METHOD_FOR[objectType]] as CrmMapper<CanonicalObjectMap[T]> | undefined;
  if (typeof fn !== "function") {
    throw new Error(`${adapter.provider} does not support mapping "${objectType}".`);
  }
  return fn(raw, ctx);
}

/** Map an array of raw records, skipping any that throw (logged by the caller). */
export function mapMany<T extends CanonicalObjectType>(
  adapter: CrmProviderAdapter,
  objectType: T,
  rows: unknown[],
  ctx: MappingContext
): { records: CanonicalObjectMap[T][]; errors: { index: number; error: string }[] } {
  const records: CanonicalObjectMap[T][] = [];
  const errors: { index: number; error: string }[] = [];
  rows.forEach((raw, index) => {
    try {
      records.push(mapRecord(adapter, objectType, raw, ctx));
    } catch (err) {
      errors.push({ index, error: err instanceof Error ? err.message : String(err) });
    }
  });
  return { records, errors };
}

// ---------------------------------------------------------------- registry
const registry = new Map<CrmProvider, CrmProviderAdapter>();

/** Register a provider adapter. Later registrations override earlier ones. */
export function registerAdapter(adapter: CrmProviderAdapter): void {
  registry.set(adapter.provider, adapter);
}

/** Look up an adapter by provider. */
export function getAdapter(provider: CrmProvider): CrmProviderAdapter | undefined {
  return registry.get(provider);
}

/** All registered adapters. */
export function listAdapters(): CrmProviderAdapter[] {
  return [...registry.values()];
}
