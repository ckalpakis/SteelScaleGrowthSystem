// =============================================================================
// Environment loader for the review-request pipeline.
//
// Validates that all required Twilio variables are present and throws a
// ConfigurationError if any are missing — fail-fast. Validation is memoized on
// first use (serverless has no single "boot" hook, so the first request / cold
// start is the earliest safe point; throwing at import time would break the
// build, which runs without these secrets).
// =============================================================================

import { ConfigurationError } from "@/lib/review/errors";
import type { TwilioConfig } from "@/lib/review/types";

const REQUIRED = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_API_KEY",
  "TWILIO_API_SECRET",
  "TWILIO_MESSAGING_SERVICE_SID",
] as const;

let cached: TwilioConfig | null = null;

/** Load + validate the Twilio config. Throws ConfigurationError if incomplete. */
export function loadTwilioConfig(): TwilioConfig {
  if (cached) return cached;

  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new ConfigurationError(`Missing required environment variables: ${missing.join(", ")}`);
  }

  cached = {
    accountSid: process.env.TWILIO_ACCOUNT_SID as string,
    apiKey: process.env.TWILIO_API_KEY as string,
    apiSecret: process.env.TWILIO_API_SECRET as string,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID as string,
  };
  return cached;
}
