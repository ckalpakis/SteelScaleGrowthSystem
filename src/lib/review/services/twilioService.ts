// =============================================================================
// Twilio service — the only place that talks to Twilio. Uses the SDK with
// API-key auth and sends via the Messaging Service SID (never a `from` number).
// Config is loaded (and validated) here; send failures become TwilioError.
// =============================================================================

import twilio from "twilio";
import { loadTwilioConfig } from "@/lib/review/config/env";
import { TwilioError } from "@/lib/review/errors";
import type { SendResult } from "@/lib/review/types";

export interface SendSmsParams {
  to: string; // E.164
  body: string;
}

/** Send an SMS through the Twilio Messaging Service. Throws TwilioError on failure. */
export async function sendSms({ to, body }: SendSmsParams): Promise<SendResult> {
  const config = loadTwilioConfig(); // throws ConfigurationError if incomplete

  try {
    const client = twilio(config.apiKey, config.apiSecret, { accountSid: config.accountSid });
    const message = await client.messages.create({
      messagingServiceSid: config.messagingServiceSid,
      to,
      body,
    });
    return { messageSid: message.sid, status: message.status };
  } catch (err) {
    const code = (err as { code?: number | string })?.code ?? null;
    const message = err instanceof Error ? err.message : "Twilio request failed.";
    throw new TwilioError(message, code);
  }
}
