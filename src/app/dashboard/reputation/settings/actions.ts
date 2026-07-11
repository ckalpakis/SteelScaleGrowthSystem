"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptionConfigured } from "@/lib/crypto";
import { saveCompanyTwilio, type SaveTwilioInput } from "@/lib/twilio";

const PATH = "/dashboard/reputation/settings";

export type TwilioSaveResult = { ok: true } | { ok: false; error: string };

// Save the caller's company Twilio credentials. The auth token is encrypted
// before it touches the database; nothing sensitive is returned to the client.
export async function saveTwilioSettings(input: SaveTwilioInput): Promise<TwilioSaveResult> {
  if (!encryptionConfigured()) {
    return { ok: false, error: "Server encryption key is not configured. Set CREDENTIALS_ENCRYPTION_KEY." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (!company) return { ok: false, error: "No company is linked to your account." };

  const admin = createAdminClient();
  const res = await saveCompanyTwilio(admin, company.id, input);
  if (!res.ok) return res;

  revalidatePath(PATH);
  return { ok: true };
}
