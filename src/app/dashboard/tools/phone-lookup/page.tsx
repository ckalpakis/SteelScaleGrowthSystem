import { requireAgencyAdmin } from "@/lib/auth";
import { twilioLookupConfigured, LOOKUP_BATCH_MAX } from "@/lib/phone-lookup/lookup.server";
import { PhoneLookupTool } from "@/components/dashboard/tools/PhoneLookupTool";

export const dynamic = "force-dynamic";

// Admin-only phone line-type checker (Twilio Lookup / Line Type Intelligence).
export default async function PhoneLookupPage() {
  await requireAgencyAdmin();
  const configured = twilioLookupConfigured();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#37352f]">Phone line‑type check</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#5f5e5b]">
          Check whether numbers are <span className="font-medium">mobile</span>, <span className="font-medium">landline</span>, or{" "}
          <span className="font-medium">VoIP</span> before texting a list. Landlines and most VoIP lines cannot receive SMS, so
          scrub them first. Powered by Twilio Lookup — each number is a small billable lookup (about $0.005). Up to {LOOKUP_BATCH_MAX}{" "}
          numbers per check.
        </p>
      </div>

      {!configured && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Twilio is not configured yet. Set <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_API_KEY</code>, and{" "}
          <code>TWILIO_API_SECRET</code> (see <code>docs/twilio-api-key-setup.md</code>).
        </div>
      )}

      <PhoneLookupTool disabled={!configured} />
    </div>
  );
}
