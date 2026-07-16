// =============================================================================
// GHL integration — sub-account (location) create + read. Server-only.
//
// createGhlLocation() is written to be SAFE ON RETRY:
//   - The POST itself is never auto-retried by the HTTP client (non-idempotent).
//   - Before creating, an optional idempotency hook checks for an existing
//     location id for this client and returns it instead of creating a second.
//   - A 409/"already exists" duplicate is surfaced as GhlDuplicateError so the
//     caller can reconcile rather than blindly creating another sub-account.
// =============================================================================

import { GHL_ENDPOINTS, REQUIRED_SCOPES } from "@/lib/ghl/config";
import { GhlError, GhlValidationError } from "@/lib/ghl/errors";
import { createLocationInputSchema, locationResponseSchema } from "@/lib/ghl/schemas";
import type { GhlAuthManager } from "@/lib/ghl/auth";
import type { GhlHttpClient } from "@/lib/ghl/client";
import type {
  CreateLocationIdempotency,
  CreateLocationInput,
  CreateLocationResult,
  GhlConfig,
  GhlLocationRecord,
} from "@/lib/ghl/types";

export interface LocationsDeps {
  config: GhlConfig;
  auth: GhlAuthManager;
  client: GhlHttpClient;
}

/** Pull the location id out of either envelope style. */
function extractLocationId(raw: unknown): string | null {
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (obj.id != null) return String(obj.id);
    const loc = obj.location;
    if (loc && typeof loc === "object" && (loc as Record<string, unknown>).id != null) {
      return String((loc as Record<string, unknown>).id);
    }
  }
  return null;
}

/**
 * Create a HighLevel sub-account (location).
 *
 * @param idempotency Optional hooks. `getExistingLocationId` is consulted FIRST;
 *   if it returns an id, no create call is made (`created: false`). After a
 *   successful create, `onCreated` persists the new id so a future retry finds it.
 */
export async function createGhlLocation(
  deps: LocationsDeps,
  input: CreateLocationInput,
  idempotency?: CreateLocationIdempotency,
): Promise<CreateLocationResult> {
  const parsedInput = createLocationInputSchema.safeParse(input);
  if (!parsedInput.success) {
    throw new GhlValidationError("Invalid createGhlLocation input.", {
      safeMessage: parsedInput.error.issues[0]?.message ?? "Invalid location input.",
      code: "validation",
    });
  }

  // Idempotency: reuse an existing location instead of creating a duplicate.
  if (idempotency?.getExistingLocationId) {
    const existing = await idempotency.getExistingLocationId();
    if (existing) {
      return { locationId: existing, created: false };
    }
  }

  deps.auth.assertScopes(REQUIRED_SCOPES.createLocation);

  const data = parsedInput.data;
  const body = {
    companyId: data.companyId ?? deps.config.companyId,
    name: data.name,
    ...(data.legalName ? { businessName: data.legalName } : {}),
    ...(data.email ? { email: data.email } : {}),
    ...(data.phone ? { phone: data.phone } : {}),
    ...(data.website ? { website: data.website } : {}),
    ...(data.address ? { address: data.address } : {}),
    ...(data.city ? { city: data.city } : {}),
    ...(data.state ? { state: data.state } : {}),
    ...(data.country ? { country: data.country } : {}),
    ...(data.postalCode ? { postalCode: data.postalCode } : {}),
    ...(data.timezone ? { timezone: data.timezone } : {}),
  };

  // retry:false is enforced by the client for POST regardless; explicit for clarity.
  const raw = await deps.client.request({
    method: "POST",
    path: GHL_ENDPOINTS.createLocation(),
    body,
    schema: locationResponseSchema,
    retry: false,
  });

  const locationId = extractLocationId(raw);
  if (!locationId) {
    throw new GhlError("GHL create-location succeeded but returned no location id.", {
      safeMessage: "HighLevel created the sub-account but did not return its id.",
      code: "missing_id",
    });
  }

  if (idempotency?.onCreated) {
    await idempotency.onCreated(locationId);
  }

  return { locationId, created: true, raw };
}

/** Read a single location by id. */
export async function getGhlLocation(deps: LocationsDeps, locationId: string): Promise<GhlLocationRecord> {
  if (!locationId) {
    throw new GhlValidationError("locationId is required.", { safeMessage: "A location id is required.", code: "validation" });
  }

  deps.auth.assertScopes(REQUIRED_SCOPES.getLocation);

  const raw = await deps.client.request({
    method: "GET",
    path: GHL_ENDPOINTS.getLocation(locationId),
    schema: locationResponseSchema,
  });

  const id = extractLocationId(raw) ?? locationId;
  const nested = (raw as { location?: { name?: unknown; companyId?: unknown } }).location;
  const name = (raw as { name?: unknown }).name ?? nested?.name ?? null;
  const companyId = (raw as { companyId?: unknown }).companyId ?? nested?.companyId ?? null;

  return {
    id,
    name: typeof name === "string" ? name : null,
    companyId: typeof companyId === "string" ? companyId : null,
    raw,
  };
}
