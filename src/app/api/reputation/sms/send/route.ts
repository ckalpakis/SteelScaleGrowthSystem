import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCompanySms } from "@/lib/reputation.sms";
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

  // 3. Send via the shared server-side path (service-role client, encrypted creds).
  const admin = createAdminClient();
  const result = await sendCompanySms(admin, company.id, {
    to,
    body,
    requestId: payload.requestId ?? null,
    contactId: payload.contactId ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Send failed." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, id: result.messageId, sid: result.sid, status: result.status });
}
