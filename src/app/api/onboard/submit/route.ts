import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { SUBMISSION_MAX_BYTES } from "@/lib/onboarding/config";
import { resolveInvitation } from "@/lib/onboarding/invitations";
import { validateLogoBytes } from "@/lib/onboarding/logo";
import { checkRateLimit, SUBMIT_RATE } from "@/lib/onboarding/rateLimit";
import { uploadOnboardingLogo } from "@/lib/onboarding/storage.server";
import { submitOnboarding } from "@/lib/onboarding/submission";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Public, token-gated onboarding submission endpoint (multipart/form-data).
//
// Security posture:
//   - Authenticated by the random invitation token in the body (a bearer
//     secret), NOT by an ambient session cookie — so classic CSRF (riding a
//     logged-in user's cookie) does not apply. We add a same-origin check as
//     defense-in-depth and reject cross-origin form posts.
//   - Body-size limit (fast Content-Length reject).
//   - Per-IP rate limit.
//   - Logo validated by real content (magic bytes), never extension/MIME alone.
//   - Provisioning is enqueued as a durable record inside a DB transaction; no
//     GHL/Twilio call happens in this request. Raw errors are never returned.
export async function POST(request: Request) {
  // 1. Same-origin defense-in-depth.
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, code: "error" }, { status: 403 });
  }

  // 2. Body-size fast reject.
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > SUBMISSION_MAX_BYTES) {
    return NextResponse.json({ ok: false, code: "error" }, { status: 413 });
  }

  // 3. Rate limit per IP.
  const ip = clientIp(request);
  const gate = checkRateLimit(`submit:${ip}`, SUBMIT_RATE.max, SUBMIT_RATE.windowMs);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, code: "error" }, { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } });
  }

  // 4. Parse the multipart form.
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, code: "error" }, { status: 400 });
  }

  const token = String(form.get("token") ?? "");
  const admin = createAdminClient();

  // 5. Re-validate the invitation server-side (also gives us its id for the
  //    logo path). Every invalid state collapses to one generic response.
  const resolved = await resolveInvitation(admin, token);
  if (resolved.reason !== "valid" || !resolved.invitation) {
    return NextResponse.json({ ok: false, code: "invalid_link" }, { status: 400 });
  }

  // 6. Handle the optional logo — validate real content, then store it and get a
  //    stable public URL. Any failure is a validation error to the client.
  let logoUrl: string | undefined;
  const logo = form.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const bytes = new Uint8Array(await logo.arrayBuffer());
    const check = validateLogoBytes(bytes);
    if (!check.ok) {
      return NextResponse.json({ ok: false, code: "validation", issues: [{ field: "logo", message: check.error }] }, { status: 400 });
    }
    try {
      const stored = await uploadOnboardingLogo(admin, resolved.invitation.id, check.bytes, check.contentType, check.ext);
      logoUrl = stored.url;
    } catch (err) {
      console.error("[onboarding] logo upload failed", err);
      return NextResponse.json({ ok: false, code: "error" }, { status: 500 });
    }
  }

  // 7. Assemble the payload and commit atomically.
  const payload = {
    legal_business_name: str(form.get("legal_business_name")),
    public_business_name: str(form.get("public_business_name")),
    owner_first_name: str(form.get("owner_first_name")),
    primary_email: str(form.get("primary_email")),
    primary_phone: str(form.get("primary_phone")),
    website_url: str(form.get("website_url")),
    address_line_1: str(form.get("address_line_1")),
    address_line_2: str(form.get("address_line_2")),
    city: str(form.get("city")),
    state: str(form.get("state")),
    postal_code: str(form.get("postal_code")),
    country: str(form.get("country")),
    timezone: str(form.get("timezone")),
    google_review_link: str(form.get("google_review_link")),
    logo_url: logoUrl,
    primary_brand_color: str(form.get("primary_brand_color")) || undefined,
    follow_up_count: intOr(form.get("follow_up_count"), 0),
    review_request_limit_14_days: intOr(form.get("review_request_limit_14_days"), 0),
    ask_for_referral: str(form.get("ask_for_referral")) === "true",
  };

  const result = await submitOnboarding(admin, token, payload);
  if (!result.ok) {
    const status = result.code === "validation" ? 400 : result.code === "invalid_link" ? 400 : 500;
    return NextResponse.json({ ok: false, code: result.code, issues: result.issues }, { status });
  }

  // 8. Generic success — the client never waits on provisioning.
  return NextResponse.json({ ok: true });
}

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}
function intOr(v: FormDataEntryValue | null, fallback: number): number {
  const n = Number(typeof v === "string" ? v : NaN);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser or same-origin navigation without Origin
  const host = request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
