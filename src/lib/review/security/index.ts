// =============================================================================
// Security barrel for the review webhook: secret, rate limit, body size.
// =============================================================================

export { assertWebhookSecret, SECRET_HEADER } from "@/lib/review/security/secret";
export { assertRateLimit } from "@/lib/review/security/rateLimit";
export { assertContentLength, assertBodyBytes, MAX_BODY_BYTES } from "@/lib/review/security/bodyLimit";

/** Best-effort client IP from proxy headers, for rate-limit keying. */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}
