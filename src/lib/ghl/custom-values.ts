// =============================================================================
// GHL integration — location custom values. Server-only.
//
// Custom values are LOCATION-scoped. These calls run against a minted location
// access token (passed as `authToken`) so they operate on exactly one
// sub-account. Results are normalized to a stable { id, name, key, value } shape.
// =============================================================================

import { GHL_ENDPOINTS, REQUIRED_SCOPES } from "@/lib/ghl/config";
import { GhlValidationError } from "@/lib/ghl/errors";
import { customValueResponseSchema, customValuesListSchema, updateCustomValueInputSchema } from "@/lib/ghl/schemas";
import type { GhlAuthManager } from "@/lib/ghl/auth";
import type { GhlHttpClient } from "@/lib/ghl/client";
import type { CustomValue } from "@/lib/ghl/types";

export interface CustomValuesDeps {
  auth: GhlAuthManager;
  client: GhlHttpClient;
}

type RawCustomValue = {
  id: string | number;
  name?: string | null;
  key?: string | null;
  fieldKey?: string | null;
  value?: string | null;
};

function normalize(item: RawCustomValue): CustomValue {
  return {
    id: String(item.id),
    name: item.name ?? null,
    // GHL exposes the merge key as either `key` or `fieldKey`; prefer `key`.
    key: item.key ?? item.fieldKey ?? null,
    value: item.value ?? null,
  };
}

/** List all custom values for a location, normalized. `locationToken` is required. */
export async function listLocationCustomValues(
  deps: CustomValuesDeps,
  locationId: string,
  locationToken: string,
): Promise<CustomValue[]> {
  if (!locationId) throw new GhlValidationError("locationId is required.", { safeMessage: "A location id is required.", code: "validation" });

  deps.auth.assertScopes(REQUIRED_SCOPES.listCustomValues);

  const raw = await deps.client.request({
    method: "GET",
    path: GHL_ENDPOINTS.listCustomValues(locationId),
    schema: customValuesListSchema,
    authToken: locationToken,
  });

  const items = Array.isArray(raw) ? raw : raw.customValues;
  return items.map(normalize);
}

/** Update a single custom value on a location. `locationToken` is required. */
export async function updateLocationCustomValue(
  deps: CustomValuesDeps,
  locationId: string,
  customValueId: string,
  input: { name?: string; value: string },
  locationToken: string,
): Promise<CustomValue> {
  if (!locationId || !customValueId) {
    throw new GhlValidationError("locationId and customValueId are required.", {
      safeMessage: "A location id and custom value id are required.",
      code: "validation",
    });
  }

  const parsed = updateCustomValueInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new GhlValidationError("Invalid custom value update input.", {
      safeMessage: parsed.error.issues[0]?.message ?? "Invalid custom value input.",
      code: "validation",
    });
  }

  deps.auth.assertScopes(REQUIRED_SCOPES.updateCustomValue);

  const raw = await deps.client.request({
    method: "PUT",
    path: GHL_ENDPOINTS.updateCustomValue(locationId, customValueId),
    body: parsed.data,
    schema: customValueResponseSchema,
    authToken: locationToken,
  });

  const item = "customValue" in raw ? raw.customValue : raw;
  return normalize(item as RawCustomValue);
}
