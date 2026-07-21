"use server";

import { requireAgencyAdmin } from "@/lib/auth";
import { lookupMany, parseNumberList, twilioLookupConfigured, LOOKUP_BATCH_MAX, type LookupResult } from "@/lib/phone-lookup/lookup.server";

export interface PhoneLookupState {
  results: LookupResult[];
  error?: string;
  truncated?: boolean;
}

// Admin-only: check whether pasted numbers are mobile / landline / VoIP via
// Twilio Lookup (Line Type Intelligence). Each number is a billable lookup.
export async function lookupPhonesAction(blob: string): Promise<PhoneLookupState> {
  await requireAgencyAdmin();

  if (!twilioLookupConfigured()) {
    return { results: [], error: "Twilio isn't configured. Set TWILIO_ACCOUNT_SID, TWILIO_API_KEY, and TWILIO_API_SECRET." };
  }

  const numbers = parseNumberList(blob ?? "");
  if (numbers.length === 0) return { results: [] };

  try {
    const results = await lookupMany(numbers);
    return { results, truncated: numbers.length > LOOKUP_BATCH_MAX };
  } catch (err) {
    console.error("[tools] phone lookup failed", err);
    return { results: [], error: "The lookup failed. Please try again." };
  }
}
