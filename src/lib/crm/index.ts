// =============================================================================
// Universal Contractor CRM — public entry point.
//
// The internal standard for the Steel Scale platform. Import canonical models,
// helpers, and the provider-adapter contract from here.
//
//   import { CanonicalCustomer, getAdapter, mapMany } from "@/lib/crm";
//
// Adapters are pure data mappers (see adapters/*). Call registerBuiltInAdapters()
// once at startup to make the bundled reference adapters resolvable via
// getAdapter(). API/sync wiring is intentionally out of scope for this layer.
// =============================================================================

export * from "@/lib/crm/models";
export * from "@/lib/crm/helpers";
export * from "@/lib/crm/provider";

import { registerAdapter } from "@/lib/crm/provider";
import { jobberAdapter } from "@/lib/crm/adapters/jobber";
import { housecallAdapter } from "@/lib/crm/adapters/housecall";

export { jobberAdapter, housecallAdapter };

let registered = false;

/** Register the built-in reference adapters (idempotent). */
export function registerBuiltInAdapters(): void {
  if (registered) return;
  registerAdapter(jobberAdapter);
  registerAdapter(housecallAdapter);
  registered = true;
}
