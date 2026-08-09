import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCompanyTwilio,
  validateTwilioSignature,
  normalizeTwilioStatus,
  readTwilioForm,
  webhookUrl,
} from "@/lib/twilio";

export const dynamic = "force-dynamic";

// POST /api/reputation/twilio/status
// Twilio message status callback. Updates the stored message as the delivery
// state changes: queued -> sent -> delivered, or undelivered / failed.
// Signature-validated with the owning company's auth token.
export async function POST(request: Request) {
  const params = await readTwilioForm(request);
  const messageSid = params.MessageSid || params.SmsSid;
  const rawStatus = params.MessageStatus || params.SmsStatus;
  if (!messageSid || !rawStatus) {
    return new Response("Missing parameters", { status: 400 });
  }

  const admin = createAdminClient();

  // Find the message this callback is about, and thus its company.
  const { data: message } = await admin
    .from("review_messages")
    .select("id, company_id, request_id, status")
    .eq("provider_message_id", messageSid)
    .maybeSingle<{ id: string; company_id: string; request_id: string | null; status: string }>();

  if (!message) {
    // Unknown SID — ack so Twilio stops retrying, but do nothing.
    return new Response("OK", { status: 200 });
  }

  // Validate the signature using this company's Twilio auth token.
  const creds = await getCompanyTwilio(admin, message.company_id);
  if (!creds) return new Response("OK", { status: 200 });

  const signature = request.headers.get("x-twilio-signature");
  const url = webhookUrl(request, "/api/reputation/twilio/status");
  if (!validateTwilioSignature(creds.authToken, url, params, signature)) {
    return new Response("Invalid signature", { status: 403 });
  }

  const status = normalizeTwilioStatus(rawStatus);
  const errorCode = params.ErrorCode || null;

  await admin
    .from("review_messages")
    .update({
      status,
      error: errorCode ? `Twilio error ${errorCode}` : null,
    })
    .eq("id", message.id);

  // Mirror terminal states onto the parent request + event log.
  if (message.request_id) {
    if (status === "delivered") {
      await admin.from("review_requests").update({ status: "delivered" }).eq("id", message.request_id);
    } else if (status === "failed" || status === "undelivered") {
      await admin.from("review_requests").update({ status: "failed" }).eq("id", message.request_id);
    }
  }

  if (status === "delivered") {
    await admin.from("review_events").insert({
      company_id: message.company_id,
      request_id: message.request_id,
      message_id: message.id,
      event_type: "message_delivered",
      data: { provider_message_id: messageSid },
    });
  } else if (status === "failed" || status === "undelivered") {
    await admin.from("review_events").insert({
      company_id: message.company_id,
      request_id: message.request_id,
      message_id: message.id,
      event_type: "message_failed",
      data: { provider_message_id: messageSid, status, error_code: errorCode },
    });
  }

  return new Response("OK", { status: 200 });
}
