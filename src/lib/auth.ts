import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Client, ClientSettings } from "@/lib/types";

// Agency super-admins are identified by email via the AGENCY_ADMIN_EMAILS env
// var (comma-separated). They can create/manage every client.
export function isAgencyAdmin(email: string | null | undefined): boolean {
  const admins = (process.env.AGENCY_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(email) && admins.includes(String(email).toLowerCase());
}

// Guard for agency-admin-only pages and actions.
export async function requireAgencyAdmin(): Promise<{ userId: string; email: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAgencyAdmin(user.email)) redirect("/dashboard");
  return { userId: user.id, email: user.email ?? "" };
}

// Resolves the signed-in user and the client (tenant) they belong to, along
// with that client's settings. Redirects to /login if unauthenticated.
// `client` is null if the profile isn't linked to a tenant yet (the UI shows
// an onboarding message in that case).
export async function requireClient(): Promise<{
  userId: string;
  email: string;
  client: Client | null;
  settings: ClientSettings | null;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id")
    .eq("id", user.id)
    .single<{ client_id: string | null }>();

  let client: Client | null = null;
  let settings: ClientSettings | null = null;

  if (profile?.client_id) {
    const [{ data: c }, { data: s }] = await Promise.all([
      supabase.from("clients").select("*").eq("id", profile.client_id).single<Client>(),
      supabase
        .from("client_settings")
        .select("*")
        .eq("client_id", profile.client_id)
        .maybeSingle<ClientSettings>(),
    ]);
    client = c;
    settings = s;
  }

  return { userId: user.id, email: user.email ?? "", client, settings };
}
