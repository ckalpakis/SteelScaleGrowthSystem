import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /r/<code>
// Public, unauthenticated review-link redirector. Records the click (timestamp,
// contact, company, IP, browser, referrer), advances the review request, then
// 302-redirects to the destination review URL (e.g. the company's Google page).
export async function GET(request: Request, { params }: { params: { code: string } }) {
  const code = params.code;
  const fallback = new URL("/", request.url);

  if (!code) return NextResponse.redirect(fallback, 302);

  const admin = createAdminClient();

  const { data: req } = await admin
    .from("review_requests")
    .select("id, company_id, contact_id, review_url, status")
    .eq("short_code", code)
    .maybeSingle<{
      id: string;
      company_id: string;
      contact_id: string;
      review_url: string | null;
      status: string;
    }>();

  if (!req) return NextResponse.redirect(fallback, 302);

  // Resolve the destination: request's own URL, else the company's Google URL.
  let destination = req.review_url;
  if (!destination) {
    const { data: settings } = await admin
      .from("review_settings")
      .select("google_review_url")
      .eq("company_id", req.company_id)
      .maybeSingle<{ google_review_url: string | null }>();
    destination = settings?.google_review_url ?? null;
  }

  // Best-effort click capture — never block the redirect on logging.
  try {
    const ip = clientIp(request);
    const userAgent = request.headers.get("user-agent");
    const referrer = request.headers.get("referer");

    await admin.from("review_clicks").insert({
      company_id: req.company_id,
      request_id: req.id,
      contact_id: req.contact_id,
      ip_address: ip,
      user_agent: userAgent,
      referrer,
    });

    // Advance the request the first time it's clicked (don't downgrade a
    // completed request).
    if (req.status !== "clicked" && req.status !== "completed") {
      await admin
        .from("review_requests")
        .update({ status: "clicked", clicked_at: new Date().toISOString() })
        .eq("id", req.id);
    }

    await admin.from("review_events").insert({
      company_id: req.company_id,
      request_id: req.id,
      contact_id: req.contact_id,
      event_type: "clicked",
      data: { user_agent: userAgent },
    });
  } catch (err) {
    console.error("[review-link] click logging failed", err);
  }

  return NextResponse.redirect(safeUrl(destination) ?? fallback, 302);
}

// Only redirect to a valid absolute http(s) URL.
function safeUrl(raw: string | null): URL | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

// Pull the client IP from proxy headers; return null if it isn't a plausible IP
// (the column is inet, so we must not pass junk).
function clientIp(request: Request): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  const candidate = (fwd ? fwd.split(",")[0] : request.headers.get("x-real-ip"))?.trim();
  if (!candidate) return null;
  const isV4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(candidate);
  const isV6 = /^[0-9a-fA-F:]+$/.test(candidate) && candidate.includes(":");
  return isV4 || isV6 ? candidate : null;
}
