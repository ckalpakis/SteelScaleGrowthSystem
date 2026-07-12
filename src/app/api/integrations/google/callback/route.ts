import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeGoogleCode, getGoogleUserEmail } from "@/lib/google/oauth";
import { saveGoogleTokens } from "@/lib/google/sync.server";

export const dynamic = "force-dynamic";

// GET /api/integrations/google/callback
// Completes OAuth: validates the CSRF state, exchanges the code for tokens,
// stores them encrypted, and marks the integration connected.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("g_oauth_state="))
    ?.split("=")[1];

  const back = new URL("/dashboard/integrations", request.url);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  if (!code || !state || state !== cookieState) {
    back.searchParams.set("error", "google_oauth_state");
    return clearAndRedirect(back);
  }

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle<{ id: string }>();
  if (!company) {
    back.searchParams.set("error", "no_company");
    return clearAndRedirect(back);
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    const email = await getGoogleUserEmail(tokens.access_token);
    const admin = createAdminClient();

    await saveGoogleTokens(admin, company.id, tokens, email);
    await admin.from("integration_connections").upsert(
      {
        company_id: company.id,
        provider: "google_business",
        status: "connected",
        connected_account: email,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "company_id,provider" }
    );

    back.searchParams.set("connected", "google");
  } catch (err) {
    console.error("[google-oauth] callback failed", err);
    back.searchParams.set("error", "google_oauth");
  }

  return clearAndRedirect(back);
}

function clearAndRedirect(url: URL): NextResponse {
  const res = NextResponse.redirect(url);
  res.cookies.set("g_oauth_state", "", { path: "/", maxAge: 0 });
  return res;
}
