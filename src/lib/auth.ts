import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/types";

// Resolves the signed-in user and the client (tenant) they belong to.
// Redirects to /login if unauthenticated. Returns null client if the profile
// isn't linked to a tenant yet (shown as an onboarding message in the UI).
export async function requireClient(): Promise<{ userId: string; email: string; client: Client | null }> {
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
  if (profile?.client_id) {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("id", profile.client_id)
      .single<Client>();
    client = data;
  }

  return { userId: user.id, email: user.email ?? "", client };
}
