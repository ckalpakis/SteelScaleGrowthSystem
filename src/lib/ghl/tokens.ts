// =============================================================================
// GHL integration — location access tokens. Server-only.
//
// A location (sub-account) access token is minted FROM the agency token so that
// location-scoped calls (custom values, etc.) run against a single sub-account.
// The mint call itself uses the agency token; the returned token is short-lived
// and must never be sent to the browser.
// =============================================================================

import { GHL_ENDPOINTS, REQUIRED_SCOPES } from "@/lib/ghl/config";
import { GhlValidationError } from "@/lib/ghl/errors";
import { locationTokenResponseSchema } from "@/lib/ghl/schemas";
import type { GhlAuthManager } from "@/lib/ghl/auth";
import type { GhlHttpClient } from "@/lib/ghl/client";
import type { GhlConfig, LocationAccessToken } from "@/lib/ghl/types";

export interface TokensDeps {
  config: GhlConfig;
  auth: GhlAuthManager;
  client: GhlHttpClient;
}

/**
 * Mint a location access token for `locationId` using the agency token.
 *
 * VERIFY: the current HighLevel endpoint is `POST /oauth/locationToken` with a
 * form-encoded body `{ companyId, locationId }`. The exact content type and
 * response key are confirmed defensively by the schema.
 */
export async function getLocationAccessToken(
  deps: TokensDeps,
  locationId: string,
  companyId?: string,
): Promise<LocationAccessToken> {
  if (!locationId) {
    throw new GhlValidationError("locationId is required to mint a location token.", {
      safeMessage: "A location id is required.",
      code: "validation",
    });
  }

  deps.auth.assertScopes(REQUIRED_SCOPES.locationToken);

  const parsed = await deps.client.request({
    method: "POST",
    path: GHL_ENDPOINTS.locationToken(),
    body: {
      companyId: companyId ?? deps.config.companyId,
      locationId,
    },
    schema: locationTokenResponseSchema,
  });

  return {
    accessToken: (parsed.access_token ?? parsed.accessToken) as string,
    expiresIn: parsed.expires_in ?? parsed.expiresIn,
  };
}
