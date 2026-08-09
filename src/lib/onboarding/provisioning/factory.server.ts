// =============================================================================
// Onboarding provisioning — production wiring. Server-only.
//
// Builds a ProvisioningEngine backed by the real service-role Supabase store and
// the real GHL agency client. The GHL facade has no official snapshot-apply API,
// so applySnapshot/getSnapshotStatus are intentionally omitted → the engine
// takes the manual (admin task) snapshot path.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

import { createGhlAgencyClient } from "@/lib/ghl";
import { ProvisioningEngine } from "@/lib/onboarding/provisioning/engine";
import { SupabaseProvisioningStore } from "@/lib/onboarding/provisioning/store.server";
import type { GhlProvisioningClient } from "@/lib/onboarding/provisioning/types";
import type { Logger } from "@/lib/onboarding/provisioning/steps";

/** Adapt the GHL agency facade to the narrower client the engine consumes. */
export function ghlProvisioningClient(logger?: Logger): GhlProvisioningClient {
  const ghl = createGhlAgencyClient({ logger });
  return {
    createLocation: (input, idempotency) => ghl.createLocation(input, idempotency),
    getLocation: (id) => ghl.getLocation(id),
    getLocationAccessToken: (id, companyId) => ghl.getLocationAccessToken(id, companyId),
    listLocationCustomValues: (id, token) => ghl.listLocationCustomValues(id, token),
    updateLocationCustomValue: (id, cvId, input, token) => ghl.updateLocationCustomValue(id, cvId, input, token),
    listSnapshots: () => ghl.listSnapshots(),
    snapshotAutomationSupport: () => ghl.snapshotAutomationSupport(),
    assertScopes: (required) => ghl.auth.assertScopes(required),
    // applySnapshot / getSnapshotStatus intentionally omitted (no official API).
  };
}

/** Construct a production provisioning engine. */
export function createProvisioningEngine(admin: SupabaseClient, opts: { workerId?: string; logger?: Logger } = {}): ProvisioningEngine {
  const store = new SupabaseProvisioningStore(admin);
  const ghl = ghlProvisioningClient(opts.logger);
  return new ProvisioningEngine({ store, ghl, workerId: opts.workerId, logger: opts.logger });
}
