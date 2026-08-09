// =============================================================================
// GHL integration — configuration, endpoints, and required scopes. Server-only.
//
// AUTH MODEL NOTE (must be verified against the live HighLevel docs):
//   Creating sub-accounts and minting location tokens are AGENCY-level
//   operations. On current HighLevel these are exposed through the API v2
//   (services.leadconnectorhq.com) using an AGENCY (Company) OAuth access token.
//   Private Integration Tokens exist but are commonly LOCATION-scoped; whether an
//   agency-level PIT can create sub-accounts / mint location tokens must be
//   confirmed for your plan. We therefore DEFAULT to OAuth and also support PIT
//   behind a config switch. Deprecated v1 Agency API keys are NOT used.
//
// Endpoint paths and scope strings below reflect the documented API v2 surface
// but MUST be confirmed in your HighLevel developer console (see
// docs/ghl-authentication-setup.md). They are centralized here so a correction
// is a one-line change.
// =============================================================================

import { GhlConfigurationError } from "@/lib/ghl/errors";
import type { GhlConfig } from "@/lib/ghl/types";

export const GHL_DEFAULT_BASE_URL = "https://services.leadconnectorhq.com";
export const GHL_DEFAULT_API_VERSION = "2021-07-28";
export const GHL_DEFAULT_TIMEOUT_MS = 15_000;

// Documented API v2 paths (VERIFY).
export const GHL_ENDPOINTS = {
  oauthToken: () => `/oauth/token`,
  locationToken: () => `/oauth/locationToken`,
  createLocation: () => `/locations/`,
  getLocation: (id: string) => `/locations/${id}`,
  listCustomValues: (locationId: string) => `/locations/${locationId}/customValues`,
  updateCustomValue: (locationId: string, id: string) => `/locations/${locationId}/customValues/${id}`,
  listSnapshots: () => `/snapshots/`,
} as const;

// Best-known scope strings (VERIFY in the marketplace app). Kept as a map so the
// operator can correct them without touching call sites.
export const GHL_SCOPES = {
  locationsRead: "locations.readonly",
  locationsWrite: "locations.write",
  customValuesRead: "locations/customValues.readonly",
  customValuesWrite: "locations/customValues.write",
  snapshotsRead: "snapshots.readonly",
} as const;

export const REQUIRED_SCOPES = {
  createLocation: [GHL_SCOPES.locationsWrite],
  getLocation: [GHL_SCOPES.locationsRead],
  // Minting a location token uses the agency token; it typically needs the
  // location scopes the token was installed with. VERIFY.
  locationToken: [GHL_SCOPES.locationsWrite],
  listCustomValues: [GHL_SCOPES.customValuesRead],
  updateCustomValue: [GHL_SCOPES.customValuesWrite],
  listSnapshots: [GHL_SCOPES.snapshotsRead],
} as const;

function splitList(v: string | undefined): string[] {
  return (v ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

let cached: GhlConfig | null = null;

/** Load + validate GHL config from the environment. Throws GhlConfigurationError. */
export function loadGhlConfig(): GhlConfig {
  if (cached) return cached;

  const authMethod = (process.env.GHL_AUTH_METHOD ?? "oauth") as GhlConfig["authMethod"];
  const companyId = process.env.GHL_COMPANY_ID ?? "";
  if (!companyId) throw new GhlConfigurationError("GHL_COMPANY_ID is required.");

  const base: GhlConfig = {
    baseUrl: (process.env.GHL_BASE_URL ?? GHL_DEFAULT_BASE_URL).replace(/\/$/, ""),
    apiVersion: process.env.GHL_API_VERSION ?? GHL_DEFAULT_API_VERSION,
    authMethod,
    companyId,
    timeoutMs: Number(process.env.GHL_TIMEOUT_MS ?? GHL_DEFAULT_TIMEOUT_MS),
    grantedScopes: splitList(process.env.GHL_GRANTED_SCOPES),
  };

  if (authMethod === "private_integration") {
    const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
    if (!token) throw new GhlConfigurationError("GHL_PRIVATE_INTEGRATION_TOKEN is required for private_integration auth.");
    cached = { ...base, privateIntegrationToken: token };
    return cached;
  }

  // OAuth (default)
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  const accessToken = process.env.GHL_ACCESS_TOKEN;
  const refreshToken = process.env.GHL_REFRESH_TOKEN;
  if (!clientId || !clientSecret) throw new GhlConfigurationError("GHL_CLIENT_ID and GHL_CLIENT_SECRET are required for OAuth.");
  if (!accessToken) throw new GhlConfigurationError("GHL_ACCESS_TOKEN is required (seed from the OAuth install).");

  cached = {
    ...base,
    clientId,
    clientSecret,
    tokenUrl: process.env.GHL_TOKEN_URL ?? `${base.baseUrl}${GHL_ENDPOINTS.oauthToken()}`,
    accessToken,
    refreshToken,
    tokenExpiresAt: process.env.GHL_TOKEN_EXPIRES_AT,
  };
  return cached;
}

/** For tests. */
export function _resetGhlConfigCache(): void {
  cached = null;
}
