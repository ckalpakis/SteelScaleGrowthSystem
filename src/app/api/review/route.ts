import { NextResponse } from "next/server";
import { z } from "zod";
import { toE164 } from "@/lib/sms";
import { sendReviewRequest, TwilioConfigError } from "@/lib/twilio";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

// =============================================================================
// POST /api/review
//
// Receives a webhook (e.g. from a GoHighLevel workflow) and sends a review-
// request SMS through the Twilio Messaging Service. Validation only — no auth,
// no database, no retries, no UI. All Twilio logic lives in @/lib/twilio.
// =============================================================================

const ReviewWebhookSchema = z.object({
  contactId: z.string().optional(),
  firstName: z.string().trim().min(1, "firstName is required"),
  lastName: z.string().optional(),
  phone: z.string().trim().min(1, "phone is required"),
  email: z.string().optional(),
  businessName: z.string().trim().min(1, "businessName is required"),
  businessOwner: z.string().optional(),
  reviewLink: z.string().trim().url("reviewLink must be a valid URL"),
  logo: z.string().optional(),
  image: z.string().optional(),
  messageType: z.string().optional(),
});

export async function POST(request: Request) {
  console.log("[review] request received");

  // 1. Parse JSON.
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    console.warn("[review] invalid JSON body");
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  // 2. Validate shape (missing firstName / phone / reviewLink / businessName).
  const parsed = ReviewWebhookSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
    console.warn("[review] validation failed", details);
    return NextResponse.json({ success: false, error: "Validation failed.", details }, { status: 400 });
  }
  const data = parsed.data;

  // 3. Normalize + validate the phone number.
  const phone = toE164(data.phone);
  if (!phone) {
    console.warn("[review] invalid phone", { phone: data.phone });
    return NextResponse.json({ success: false, error: "Invalid phone number." }, { status: 400 });
  }

  console.log("[review] validated", { phone, business: data.businessName });

  // 4. Send the SMS via the Twilio Messaging Service.
  try {
    const { messageSid, status } = await sendReviewRequest({
      firstName: data.firstName,
      businessName: data.businessName,
      reviewLink: data.reviewLink,
      to: phone,
    });

    console.log("[review] success", { messageSid, status, phone, business: data.businessName });
    return NextResponse.json({ success: true, messageSid }, { status: 200 });
  } catch (err) {
    // Missing configuration → 500 (server misconfig, not the caller's fault).
    if (err instanceof TwilioConfigError) {
      console.error("[review] config error", { message: err.message });
      return NextResponse.json({ success: false, error: "SMS service is not configured." }, { status: 500 });
    }

    // Twilio / network failures → 502.
    const code = (err as { code?: number | string })?.code;
    const message = err instanceof Error ? err.message : "Failed to send message.";
    console.error("[review] Twilio send failed", { phone, business: data.businessName, code, message });
    return NextResponse.json({ success: false, error: "Failed to send message.", code: code ?? null }, { status: 502 });
  }
}
