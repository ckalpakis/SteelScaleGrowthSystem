import { NextResponse } from "next/server";
import { sendAgencyInquiryEmail } from "@/lib/email";

// Public endpoint for the agency's own contact/quote form on
// steelscalesystems.com. Emails the Steel Scale inbox (no CRM tenant involved).
export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = str(payload.name);
  const email = str(payload.email);
  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }

  const ok = await sendAgencyInquiryEmail({
    name,
    email,
    phone: str(payload.phone),
    business: str(payload.business),
    message: str(payload.message),
    smsConsent: payload.sms_consent === true,
  });

  if (!ok) {
    return NextResponse.json({ error: "Could not send your message. Please email support@steelscale.xyz." }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}
