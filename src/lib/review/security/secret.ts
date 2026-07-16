// =============================================================================
// Webhook secret verification.
//
// Every caller must send the shared secret in the `x-steelscale-secret` header.
// For the MVP a single secret lives in STEELSCALE_WEBHOOK_SECRET. Comparison is
// timing-safe (hash both sides to a fixed length, then timingSafeEqual — this
// avoids both length-leak and the length-mismatch throw). Fails closed: if no
// secret is configured, every request is rejected.
// =============================================================================

import { createHash, timingSafeEqual } from "crypto";
import { UnauthorizedError } from "@/lib/review/errors";

export const SECRET_HEADER = "x-steelscale-secret";

function timingSafeEqualStr(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Throw UnauthorizedError unless the request carries the correct secret. */
export function assertWebhookSecret(headers: Headers): void {
  const expected = process.env.STEELSCALE_WEBHOOK_SECRET;
  if (!expected) {
    // Fail closed — an unconfigured secret must not leave the webhook open.
    console.error("[review] STEELSCALE_WEBHOOK_SECRET is not configured — rejecting request");
    throw new UnauthorizedError("Webhook secret is not configured.");
  }

  const provided = headers.get(SECRET_HEADER);
  if (!provided || !timingSafeEqualStr(provided, expected)) {
    throw new UnauthorizedError("Invalid or missing webhook secret.");
  }
}
