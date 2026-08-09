import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";

// Server-only Reputation helpers (import server code — never used by client).

// The company_id for the signed-in user (RLS returns only their own company).
export async function getCurrentCompanyId(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.from("companies").select("id").limit(1).maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

// Short, URL-safe, unguessable code for review links (e.g. "a1B2c3d4").
const CODE_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
export function generateShortCode(length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}
