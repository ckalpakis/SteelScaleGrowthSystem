// =============================================================================
// Phone validation + normalization, backed by libphonenumber-js.
//
// Numbers are parsed with a US default region (bare 10-digit numbers become
// +1…). Returns E.164, or throws ValidationError for anything not valid.
// =============================================================================

import { parsePhoneNumberFromString } from "libphonenumber-js";
import { ValidationError } from "@/lib/review/errors";

const DEFAULT_REGION = "US";

/** Normalize a phone to E.164, or null if it isn't a valid number. */
export function normalizePhone(raw: string): string | null {
  const parsed = parsePhoneNumberFromString(raw.trim(), DEFAULT_REGION);
  return parsed && parsed.isValid() ? parsed.number : null;
}

/** Normalize + validate a phone. Throws ValidationError("Invalid phone number.") if invalid. */
export function requireValidPhone(raw: string): string {
  const normalized = normalizePhone(raw);
  if (!normalized) throw new ValidationError("Invalid phone number.");
  return normalized;
}
