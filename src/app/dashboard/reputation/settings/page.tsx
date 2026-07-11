import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTwilioSummary, type TwilioConfigSummary } from "@/lib/twilio";
import { DEFAULT_REVIEW_SETTINGS, type ReviewSettingsValues } from "@/lib/reputation";
import { PageHeader } from "@/components/dashboard/reputation/ui";
import { ReputationSettingsForm } from "@/components/dashboard/reputation/settings/ReputationSettingsForm";
import { TwilioSettingsForm } from "@/components/dashboard/reputation/settings/TwilioSettingsForm";
import { TestSmsForm } from "@/components/dashboard/reputation/settings/TestSmsForm";

export const dynamic = "force-dynamic";

const EMPTY_TWILIO: TwilioConfigSummary = {
  configured: false,
  accountSid: null,
  messagingServiceSid: null,
  phoneNumber: null,
  isActive: false,
};

async function loadSettings(): Promise<{ settings: ReviewSettingsValues; twilio: TwilioConfigSummary }> {
  const supabase = createClient();
  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle<{ id: string }>();
  if (!company) return { settings: DEFAULT_REVIEW_SETTINGS, twilio: EMPTY_TWILIO };

  const { data: row } = await supabase
    .from("review_settings")
    .select(
      "google_review_url, business_name, request_signature, default_delay_minutes, default_reminder_count, timezone, sms_send_start_hour, sms_send_end_hour, quiet_hours_enabled, quiet_start_hour, quiet_end_hour"
    )
    .eq("company_id", company.id)
    .maybeSingle<Partial<ReviewSettingsValues>>();

  const settings: ReviewSettingsValues = { ...DEFAULT_REVIEW_SETTINGS, ...(row ?? {}) };
  const twilio = await getTwilioSummary(createAdminClient(), company.id);
  return { settings, twilio };
}

export default async function ReputationSettingsPage() {
  const { settings, twilio } = await loadSettings();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Configure how your reputation tools work." />

      <ReputationSettingsForm initial={settings} />

      <TwilioSettingsForm summary={twilio} />
      <TestSmsForm configured={twilio.configured} />
    </div>
  );
}
