import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCompanyTwilio, sendTwilioSms, appBaseUrl, normalizeTwilioStatus } from "@/lib/twilio";
import { toE164 } from "@/lib/sms";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST /api/reputation/sms/send
// Send an SMS from the signed-in user's company. Credentials are read
// server-side only; the browser never sees the Twilio auth token.
// Body: { to: string, body: string, requestId?: string, contactId?: string }
export async function POST(request: Request) {
  // 1. Authenticate + resolve the caller's company via RLS.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (!company) return NextResponse.json({ error: "No company linked to your account." }, { status: 400 });

  // 2. Parse + validate input.
  let payload: { to?: string; body?: string; requestId?: string; contactId?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const to = toE164(payload.to);
  const body = (payload.body ?? "").trim();
  if (!to) return NextResponse.json({ error: "A valid destination number is required." }, { status: 400 });
  if (!body) return NextResponse.json({ error: "Message body is required." }, { status: 400 });

  // 3. Load Twilio credentials with the service-role client (bypasses RLS).
  const admin = createAdminClient();
  const creds = await getCompanyTwilio(admin, company.id);
  if (!creds) {
    return NextResponse.json({ error: "Twilio is not configured for your company." }, { status: 400 });
  }

  // 4. Record the outbound message first (status queued) so we always have history.
  const { data: message, error: insertError } = await admin
    .from("review_messages")
    .insert({
      company_id: company.id,
      request_id: payload.requestId ?? null,
      channel: "sms",
      direction: "outbound",
      to_address: to,
      from_address: creds.phoneNumber,
      body,
      provider: "twilio",
      status: "queued",
    })
    .select("id")
    .single<{ id: string }>();

  if (insertError || !message) {
    return NextResponse.json({ error: "Could not record the message." }, { status: 500 });
  }

  // 5. Send via Twilio, asking it to POST delivery updates to our status webhook.
  const base = appBaseUrl();
  const statusCallback = base ? `${base}/api/reputation/twilio/status` : null;
  const result = await sendTwilioSms(creds, { to, body, statusCallback });

  // 6. Reflect the outcome on the stored message.
  if (result.ok) {
    await admin
      .from("review_messages")
      .update({
        provider_message_id: result.sid,
        status: normalizeTwilioStatus(result.status),
        sent_at: new Date().toISOString(),
      })
      .eq("id", message.id);

    await admin.from("review_events").insert({
      company_id: company.id,
      request_id: payload.requestId ?? null,
      message_id: message.id,
      contact_id: payload.contactId ?? null,
      event_type: "message_sent",
      data: { channel: "sms", provider_message_id: result.sid },
    });

    return NextResponse.json({ ok: true, id: message.id, sid: result.sid, status: result.status });
  }

  await admin
    .from("review_messages")
    .update({ status: "failed", error: result.error })
    .eq("id", message.id);

  await admin.from("review_events").insert({
    company_id: company.id,
    request_id: payload.requestId ?? null,
    message_id: message.id,
    contact_id: payload.contactId ?? null,
    event_type: "message_failed",
    data: { channel: "sms", error: result.error, code: result.code },
  });

  return NextResponse.json({ error: result.error ?? "Send failed." }, { status: 502 });
}
