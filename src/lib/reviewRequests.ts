import type { SupabaseClient } from "@supabase/supabase-js";
import type { Client, ClientSettings, Lead } from "./types";
import { sendReviewRequestEmail } from "./email";
import { sendSms, smsConfigured } from "./sms";
import { buildReviewMessage } from "./review";

// Sends a review request to one past customer via every available channel
// (email + SMS), then stamps review_requested_at so they're never asked twice.
// Works with either a user-session client (server action) or the admin client
// (cron). Fails soft per channel.
export async function sendReviewRequest(
  supabase: SupabaseClient,
  client: Client,
  settings: ClientSettings | null,
  lead: Lead
): Promise<{ sent: boolean; channels: string[] }> {
  const channels: string[] = [];

  // Nothing to point them at — skip.
  if (!settings?.google_review_link) return { sent: false, channels };

  if (lead.email) {
    const ok = await sendReviewRequestEmail(client, settings, lead);
    if (ok) channels.push("email");
  }
  // Only text customers who explicitly opted in on the quote form (TCPA/A2P).
  if (lead.phone && lead.sms_consent && smsConfigured()) {
    const ok = await sendSms(lead.phone, buildReviewMessage(client, settings, lead));
    if (ok) channels.push("sms");
  }

  // Only mark as requested if something actually went out, so a transient
  // failure gets retried on the next run.
  if (channels.length > 0) {
    await supabase
      .from("leads")
      .update({ review_requested_at: new Date().toISOString() })
      .eq("id", lead.id);
  }

  return { sent: channels.length > 0, channels };
}
