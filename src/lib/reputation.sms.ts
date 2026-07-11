import type { SupabaseClient } from "@supabase/supabase-js";
import { getCompanyTwilio, sendTwilioSms, appBaseUrl, normalizeTwilioStatus } from "@/lib/twilio";
import { toE164 } from "@/lib/sms";

// =============================================================================
// Shared server-side SMS send for the Reputation module. Used by the send API
// endpoint and the workflow engine. Server-only.
//
// Idempotency: when a stepKey + requestId is given, the same step can only be
// sent once. If a message for that step already has a provider id, we return
// early (alreadySent) instead of texting again — this is how the engine avoids
// duplicate sends on retries.
// =============================================================================

export interface SendSmsOptions {
  to: string;
  body: string;
  requestId?: string | null;
  contactId?: string | null;
  stepKey?: string | null;
}

export interface CompanySendResult {
  ok: boolean;
  messageId?: string;
  sid?: string;
  status?: string;
  error?: string;
  alreadySent?: boolean;
}

export async function sendCompanySms(
  admin: SupabaseClient,
  companyId: string,
  opts: SendSmsOptions
): Promise<CompanySendResult> {
  const dest = toE164(opts.to);
  if (!dest) return { ok: false, error: "Invalid destination number." };

  const creds = await getCompanyTwilio(admin, companyId);
  if (!creds) return { ok: false, error: "Twilio is not configured for this company." };

  const stepKey = opts.stepKey ?? null;
  const requestId = opts.requestId ?? null;

  // 1. Reuse or create the message row (idempotent per request+step).
  let messageId: string | null = null;
  if (stepKey && requestId) {
    const { data: existing } = await admin
      .from("review_messages")
      .select("id, provider_message_id, status")
      .eq("request_id", requestId)
      .eq("step_key", stepKey)
      .eq("direction", "outbound")
      .maybeSingle<{ id: string; provider_message_id: string | null; status: string }>();

    if (existing?.provider_message_id) {
      // Already sent — do not text again.
      return { ok: true, messageId: existing.id, sid: existing.provider_message_id, status: existing.status, alreadySent: true };
    }
    if (existing) messageId = existing.id; // leftover from a crashed attempt — retry into it
  }

  if (!messageId) {
    const { data: inserted, error: insertError } = await admin
      .from("review_messages")
      .insert({
        company_id: companyId,
        request_id: requestId,
        channel: "sms",
        direction: "outbound",
        to_address: dest,
        from_address: creds.phoneNumber,
        body: opts.body,
        provider: "twilio",
        status: "queued",
        step_key: stepKey,
      })
      .select("id")
      .single<{ id: string }>();

    if (insertError || !inserted) {
      // Unique-violation race: another worker created the step. Re-read it.
      if (insertError?.code === "23505" && stepKey && requestId) {
        const { data: race } = await admin
          .from("review_messages")
          .select("id, provider_message_id, status")
          .eq("request_id", requestId)
          .eq("step_key", stepKey)
          .eq("direction", "outbound")
          .maybeSingle<{ id: string; provider_message_id: string | null; status: string }>();
        if (race?.provider_message_id) {
          return { ok: true, messageId: race.id, sid: race.provider_message_id, status: race.status, alreadySent: true };
        }
        if (race) messageId = race.id;
      }
      if (!messageId) return { ok: false, error: insertError?.message ?? "Could not record the message." };
    } else {
      messageId = inserted.id;
    }
  }

  // 2. Send via Twilio, wiring up the delivery-status webhook.
  const base = appBaseUrl();
  const statusCallback = base ? `${base}/api/reputation/twilio/status` : null;
  const result = await sendTwilioSms(creds, { to: dest, body: opts.body, statusCallback });

  // 3. Record the outcome + event log.
  if (result.ok) {
    await admin
      .from("review_messages")
      .update({
        provider_message_id: result.sid,
        status: normalizeTwilioStatus(result.status),
        sent_at: new Date().toISOString(),
        error: null,
      })
      .eq("id", messageId!);

    await admin.from("review_events").insert({
      company_id: companyId,
      request_id: requestId,
      message_id: messageId,
      contact_id: opts.contactId ?? null,
      event_type: "message_sent",
      data: { channel: "sms", provider_message_id: result.sid, step_key: stepKey },
    });

    return { ok: true, messageId: messageId!, sid: result.sid, status: result.status };
  }

  await admin.from("review_messages").update({ status: "failed", error: result.error }).eq("id", messageId!);
  await admin.from("review_events").insert({
    company_id: companyId,
    request_id: requestId,
    message_id: messageId,
    contact_id: opts.contactId ?? null,
    event_type: "message_failed",
    data: { channel: "sms", error: result.error, code: result.code, step_key: stepKey },
  });

  return { ok: false, messageId: messageId!, error: result.error };
}
