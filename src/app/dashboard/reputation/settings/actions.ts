"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptionConfigured } from "@/lib/crypto";
import { saveCompanyTwilio, type SaveTwilioInput } from "@/lib/twilio";
import { sendCompanySms } from "@/lib/reputation.sms";
import { type ReviewSettingsValues } from "@/lib/reputation";

const PATH = "/dashboard/reputation/settings";

export type TwilioSaveResult = { ok: true } | { ok: false; error: string };
export type SettingsResult = { ok: true } | { ok: false; error: string };

// Resolve the signed-in user's company id (RLS-scoped).
async function currentCompanyId() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("companies").select("id").limit(1).maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

function clampHour(h: number, max = 23): number {
  if (!Number.isFinite(h)) return 0;
  return Math.min(Math.max(Math.floor(h), 0), max);
}

// Save the general Reputation settings for the caller's company.
export async function saveReputationSettings(input: ReviewSettingsValues): Promise<SettingsResult> {
  const companyId = await currentCompanyId();
  if (!companyId) return { ok: false, error: "No company is linked to your account." };

  const url = (input.google_review_url ?? "").trim();
  if (url && !/^https?:\/\//i.test(url)) {
    return { ok: false, error: "The Google review URL should start with http:// or https://." };
  }

  const row = {
    company_id: companyId,
    google_review_url: url || null,
    business_name: (input.business_name ?? "").trim() || null,
    request_signature: (input.request_signature ?? "").trim() || null,
    default_delay_minutes: Math.max(0, Math.floor(input.default_delay_minutes || 0)),
    default_reminder_count: Math.min(Math.max(0, Math.floor(input.default_reminder_count || 0)), 5),
    timezone: input.timezone || "America/New_York",
    sms_send_start_hour: clampHour(input.sms_send_start_hour),
    sms_send_end_hour: clampHour(input.sms_send_end_hour, 24),
    quiet_hours_enabled: !!input.quiet_hours_enabled,
    quiet_start_hour: clampHour(input.quiet_start_hour),
    quiet_end_hour: clampHour(input.quiet_end_hour),
  };

  const supabase = createClient();
  const { error } = await supabase.from("review_settings").upsert(row, { onConflict: "company_id" });
  if (error) return { ok: false, error: error.message };

  revalidatePath(PATH);
  return { ok: true };
}

// Send a test SMS to verify the Twilio connection.
export async function sendTestSms(phone: string): Promise<SettingsResult> {
  const companyId = await currentCompanyId();
  if (!companyId) return { ok: false, error: "No company is linked to your account." };

  const admin = createAdminClient();
  const res = await sendCompanySms(admin, companyId, {
    to: phone,
    body: "✅ Test message from Steel Scale Systems. Your SMS is connected and working.",
  });
  if (!res.ok) return { ok: false, error: res.error ?? "Could not send the test message." };
  return { ok: true };
}

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
