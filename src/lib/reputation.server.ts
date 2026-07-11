import { createClient } from "@/lib/supabase/server";

// Server-only Reputation helpers (import server code — never used by client).

// The company_id for the signed-in user (RLS returns only their own company).
export async function getCurrentCompanyId(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.from("companies").select("id").limit(1).maybeSingle<{ id: string }>();
  return data?.id ?? null;
}
