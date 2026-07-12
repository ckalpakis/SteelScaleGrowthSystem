import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googleAuthUrl, googleOAuthConfigured } from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

// GET /api/integrations/google/connect
// Starts the Google OAuth flow: sets a CSRF state cookie and redirects to the
// consent screen.
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const back = new URL("/dashboard/integrations", request.url);
  if (!googleOAuthConfigured()) {
    back.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(back);
  }

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(googleAuthUrl(state));
  res.cookies.set("g_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
