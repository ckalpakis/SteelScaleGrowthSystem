import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCompanyByTwilioNumber,
  validateTwilioSignature,
  readTwilioForm,
  webhookUrl,
  emptyTwiml,
  isStopKeyword,
} from "@/lib/twilio";
import { getOrCreateConversation, touchConversation } from "@/lib/reputation.conversations";

export const dynamic = "force-dynamic";

// POST /api/reputation/twilio/inbound
// Inbound SMS webhook. Stores the reply in message history, ties it to the
// contact when we recognize the number, and honors STOP opt-outs.
// Signature-validated with the receiving company's auth token.
export async function POST(request: Request) {
  const params = await readTwilioForm(request);
  const from = params.From;
  const to = params.To;
  const body = params.Body ?? "";
  const messageSid = params.MessageSid || params.SmsSid || null;

  if (!from || !to) return emptyTwiml();

  const admin = createAdminClient();

  // Which company owns the number that was texted?
  const match = await getCompanyByTwilioNumber(admin, to);
  if (!match) return emptyTwiml();
  const { companyId, creds } = match;

  // Validate the signature before trusting anything in the payload.
  const signature = request.headers.get("x-twilio-signature");
  const url = webhookUrl(request, "/api/reputation/twilio/inbound");
  if (!validateTwilioSignature(creds.authToken, url, params, signature)) {
    return new Response("Invalid signature", { status: 403 });
  }

  // Match the sender to a known contact (best-effort).
  const { data: contact } = await admin
    .from("review_contacts")
    .select("id")
    .eq("company_id", companyId)
    .eq("phone", from)
    .maybeSingle<{ id: string }>();

  // Thread the reply into a conversation.
  const conversationId = await getOrCreateConversation(admin, companyId, from, contact?.id ?? null);

  // Store the inbound message.
  const { data: message } = await admin
    .from("review_messages")
    .insert({
      company_id: companyId,
      channel: "sms",
      direction: "inbound",
      to_address: to,
      from_address: from,
      body,
      provider: "twilio",
      provider_message_id: messageSid,
      status: "received",
      conversation_id: conversationId,
    })
    .select("id")
    .single<{ id: string }>();

  if (conversationId) {
    await touchConversation(admin, conversationId, { direction: "inbound", preview: body });
  }

  // Honor opt-out. Twilio's Advanced Opt-Out stops delivery automatically; we
  // also reflect it in our own data so automations stop targeting this contact.
  if (isStopKeyword(body) && contact) {
    await admin
      .from("review_contacts")
      .update({ status: "opted_out", sms_consent: false })
      .eq("id", contact.id);

    await admin.from("review_events").insert({
      company_id: companyId,
      contact_id: contact.id,
      message_id: message?.id ?? null,
      event_type: "opted_out",
      data: { via: "sms_reply" },
    });
  }

  // Empty TwiML — we don't auto-reply from here.
  return emptyTwiml();
}
