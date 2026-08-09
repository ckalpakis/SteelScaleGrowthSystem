// =============================================================================
// Personalized review image — signed media URLs. Server-only.
//
// The media endpoint is PUBLIC (Twilio fetches it with no auth header), so each
// URL carries an HMAC signature over (clientId, name). Only our server can mint
// a valid URL, which stops anyone from generating arbitrary images at our cost.
// =============================================================================

import { createHmac, timingSafeEqual } from "node:crypto";

function signingSecret(): string {
  const s = process.env.REVIEW_IMAGE_SIGNING_SECRET || process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!s) throw new Error("No signing secret configured (REVIEW_IMAGE_SIGNING_SECRET or CREDENTIALS_ENCRYPTION_KEY).");
  return s;
}

/** True when a signing secret is available. */
export function reviewImageSigningConfigured(): boolean {
  return Boolean(process.env.REVIEW_IMAGE_SIGNING_SECRET || process.env.CREDENTIALS_ENCRYPTION_KEY);
}

/** HMAC-SHA256 hex signature over (clientId, name). */
export function signReviewImage(clientId: string, name: string): string {
  return createHmac("sha256", signingSecret()).update(`${clientId}|${name}`).digest("hex");
}

/** Timing-safe verification of a presented signature. */
export function verifyReviewImage(clientId: string, name: string, sig: string | null | undefined): boolean {
  if (!sig) return false;
  let expected: string;
  try {
    expected = signReviewImage(clientId, name);
  } catch {
    return false;
  }
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(sig, "hex");
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

/** Build the absolute, signed media URL Twilio will fetch. */
export function buildReviewImageUrl(appUrl: string, clientId: string, name: string): string {
  const base = appUrl.replace(/\/$/, "");
  const url = new URL(`${base}/api/media/review-image`);
  url.searchParams.set("c", clientId);
  url.searchParams.set("n", name);
  url.searchParams.set("sig", signReviewImage(clientId, name));
  return url.toString();
}
