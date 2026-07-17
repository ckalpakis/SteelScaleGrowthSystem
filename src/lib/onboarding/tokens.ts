// =============================================================================
// Client onboarding — invitation token generation & hashing. Server-only.
//
// The raw token is a cryptographically secure random string shown to the admin
// exactly once. Only its SHA-256 hash is ever stored, so a database read never
// reveals a usable link. Lookups hash the presented token and compare hashes.
// =============================================================================

import { createHash, randomBytes } from "node:crypto";

/** Bytes of entropy in a raw invitation token (256-bit). */
const TOKEN_BYTES = 32;

/** SHA-256 hex hash of a raw token. Deterministic; used for storage + lookup. */
export function hashInvitationToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

/** Generate a new invitation token. Returns the raw token and its stored hash. */
export function generateInvitationToken(): { rawToken: string; tokenHash: string } {
  // url-safe, no padding — clean to drop into /onboard/<token>.
  const rawToken = randomBytes(TOKEN_BYTES).toString("base64url");
  return { rawToken, tokenHash: hashInvitationToken(rawToken) };
}

/** Cheap shape check before hashing/looking up a presented token. */
export function looksLikeToken(value: unknown): value is string {
  return typeof value === "string" && value.length >= 32 && value.length <= 128 && /^[A-Za-z0-9_-]+$/.test(value);
}
