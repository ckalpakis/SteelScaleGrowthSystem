// =============================================================================
// Onboarding provisioning — custom-value matching + expected-value resolution.
//
// Matching is STRICT and deterministic (no fuzzy matching in production). Each
// required canonical mapping is matched against the location's discovered custom
// values in this precedence:
//   1. Previously configured exact GHL custom-value ID (mapping.ghl_custom_value_id)
//   2. Exact key match (mapping.expected_ghl_key vs value.key)
//   3. Exact normalized display-name match (mapping.expected_display_name vs value.name)
//   4. Explicit legacy key aliases (mapping.legacy_aliases)
//   5. (never) loose/fuzzy matching
// =============================================================================

import type { ClientAccount, CanonicalCustomValueKey } from "@/lib/onboarding/types";
import type { CustomValue } from "@/lib/ghl/types";
import type { CustomValueMappingRow } from "@/lib/onboarding/provisioning/types";

/** Normalize a display name for exact comparison (case/space/punct-insensitive). */
export function normalizeName(name: string | null | undefined): string {
  return (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type MatchMethod = "configured_id" | "key" | "display_name" | "legacy_alias";

export interface MatchedValue {
  canonical_key: CanonicalCustomValueKey;
  customValueId: string;
  method: MatchMethod;
  currentValue: string | null;
}

export type MatchResult =
  | { ok: true; match: MatchedValue }
  | { ok: false; canonical_key: CanonicalCustomValueKey };

/** Match one canonical mapping against the discovered custom values (strict). */
export function matchMapping(mapping: CustomValueMappingRow, values: CustomValue[]): MatchResult {
  // 1. Previously configured exact GHL custom-value ID.
  if (mapping.ghl_custom_value_id) {
    const byId = values.find((v) => v.id === mapping.ghl_custom_value_id);
    if (byId) return hit(mapping.canonical_key, byId, "configured_id");
  }
  // 2. Exact key match.
  if (mapping.expected_ghl_key) {
    const byKey = values.find((v) => v.key === mapping.expected_ghl_key);
    if (byKey) return hit(mapping.canonical_key, byKey, "key");
  }
  // 3. Exact normalized display-name match.
  if (mapping.expected_display_name) {
    const target = normalizeName(mapping.expected_display_name);
    const byName = values.find((v) => normalizeName(v.name) === target && target.length > 0);
    if (byName) return hit(mapping.canonical_key, byName, "display_name");
  }
  // 4. Explicit legacy key aliases only.
  for (const alias of mapping.legacy_aliases ?? []) {
    const byAlias = values.find((v) => v.key === alias);
    if (byAlias) return hit(mapping.canonical_key, byAlias, "legacy_alias");
  }
  // 5. No loose matching — unmatched.
  return { ok: false, canonical_key: mapping.canonical_key };
}

function hit(canonical_key: CanonicalCustomValueKey, v: CustomValue, method: MatchMethod): MatchResult {
  return { ok: true, match: { canonical_key, customValueId: v.id, method, currentValue: v.value } };
}

/**
 * The value we expect each canonical custom value to hold, derived from the
 * client account. Returns `null` for "leave as-is / do not invent" (text_1_image_link).
 * GHL stores everything as text, so numbers/booleans are stringified to the
 * shapes the existing review workflow expects.
 */
export function expectedValueFor(
  canonical: CanonicalCustomValueKey,
  client: ClientAccount,
  opts: { textImagePlaceholder?: string } = {},
): string | null {
  switch (canonical) {
    case "google_review_link":
      return client.google_review_link ?? "";
    case "logo_link":
      return client.logo_url ?? "";
    case "text_1_image_link":
      // Blank, existing legacy default, or configured placeholder — never invented.
      return opts.textImagePlaceholder ?? null;
    case "business_owner_name":
      return client.owner_first_name;
    case "business_name":
      return client.public_business_name;
    case "email_sending_domain":
      return client.email_sending_domain ?? "";
    case "minimum_review_requests_per_14_days":
      return String(client.review_request_limit_14_days);
    case "follow_up_count":
      // Written to the legacy GHL key `service_type`.
      return String(client.follow_up_count);
    case "review_requests_per_14_days":
      return "0";
    case "ask_for_referral":
      return client.ask_for_referral ? "Yes" : "No";
    default:
      return null;
  }
}
