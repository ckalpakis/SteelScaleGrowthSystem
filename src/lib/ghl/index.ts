// =============================================================================
// GHL integration — public facade. Server-only.
//
// `createGhlAgencyClient()` wires config -> auth manager -> HTTP client and
// exposes the agency operations as bound methods. Import this from server code
// only (route handlers, provisioning jobs); NEVER from a client component.
// Do not import this module from a client component — it reads secrets from the
// environment and must remain on the server.
// =============================================================================

import { GhlAuthManager } from "@/lib/ghl/auth";
import { GhlHttpClient } from "@/lib/ghl/client";
import { loadGhlConfig } from "@/lib/ghl/config";
import { createGhlLocation, getGhlLocation } from "@/lib/ghl/locations";
import { listLocationCustomValues, updateLocationCustomValue } from "@/lib/ghl/custom-values";
import { listSnapshots, snapshotAutomationSupport } from "@/lib/ghl/snapshots";
import { getLocationAccessToken } from "@/lib/ghl/tokens";
import type { GhlAuthManager as AuthManager } from "@/lib/ghl/auth";
import type {
  CreateLocationIdempotency,
  CreateLocationInput,
  GhlConfig,
  GhlLogger,
  TokenStore,
} from "@/lib/ghl/types";

export interface GhlAgencyClientDeps {
  config?: GhlConfig;
  fetchImpl?: typeof fetch;
  logger?: GhlLogger;
  tokenStore?: TokenStore;
  now?: () => number;
}

export interface GhlAgencyClient {
  readonly auth: AuthManager;
  createLocation(input: CreateLocationInput, idempotency?: CreateLocationIdempotency): ReturnType<typeof createGhlLocation>;
  getLocation(locationId: string): ReturnType<typeof getGhlLocation>;
  getLocationAccessToken(locationId: string, companyId?: string): ReturnType<typeof getLocationAccessToken>;
  listLocationCustomValues(locationId: string, locationToken: string): ReturnType<typeof listLocationCustomValues>;
  updateLocationCustomValue(
    locationId: string,
    customValueId: string,
    input: { name?: string; value: string },
    locationToken: string,
  ): ReturnType<typeof updateLocationCustomValue>;
  listSnapshots(): ReturnType<typeof listSnapshots>;
  snapshotAutomationSupport: typeof snapshotAutomationSupport;
}

/** Build a fully-wired agency client. Loads config from env unless injected. */
export function createGhlAgencyClient(deps: GhlAgencyClientDeps = {}): GhlAgencyClient {
  const config = deps.config ?? loadGhlConfig();
  const auth = new GhlAuthManager({
    config,
    fetchImpl: deps.fetchImpl,
    logger: deps.logger,
    tokenStore: deps.tokenStore,
    now: deps.now,
  });
  const client = new GhlHttpClient({ config, auth, fetchImpl: deps.fetchImpl, logger: deps.logger });

  const locationsDeps = { config, auth, client };
  const customValuesDeps = { auth, client };
  const tokensDeps = { config, auth, client };
  const snapshotsDeps = { config, auth, client };

  return {
    auth,
    createLocation: (input, idempotency) => createGhlLocation(locationsDeps, input, idempotency),
    getLocation: (locationId) => getGhlLocation(locationsDeps, locationId),
    getLocationAccessToken: (locationId, companyId) => getLocationAccessToken(tokensDeps, locationId, companyId),
    listLocationCustomValues: (locationId, locationToken) => listLocationCustomValues(customValuesDeps, locationId, locationToken),
    updateLocationCustomValue: (locationId, customValueId, input, locationToken) =>
      updateLocationCustomValue(customValuesDeps, locationId, customValueId, input, locationToken),
    listSnapshots: () => listSnapshots(snapshotsDeps),
    snapshotAutomationSupport,
  };
}

export { GhlAuthManager } from "@/lib/ghl/auth";
export { GhlHttpClient } from "@/lib/ghl/client";
export { loadGhlConfig, _resetGhlConfigCache, GHL_SCOPES, REQUIRED_SCOPES, GHL_ENDPOINTS } from "@/lib/ghl/config";
export { createGhlLocation, getGhlLocation } from "@/lib/ghl/locations";
export { listLocationCustomValues, updateLocationCustomValue } from "@/lib/ghl/custom-values";
export { listSnapshots, snapshotAutomationSupport } from "@/lib/ghl/snapshots";
export { getLocationAccessToken } from "@/lib/ghl/tokens";
export * from "@/lib/ghl/errors";
export type * from "@/lib/ghl/types";
