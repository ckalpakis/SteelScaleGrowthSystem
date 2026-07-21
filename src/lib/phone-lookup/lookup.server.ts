// =============================================================================
// Phone line-type lookup — Twilio Lookup v2 (Line Type Intelligence). Server-only.
//
// Tells whether a number is a mobile, landline, or VoIP line (handy for scrubbing
// a list before an SMS campaign — landlines/VoIP can't receive texts reliably).
// Uses the agency Twilio credentials (API-key auth). The network call is injected
// so the parsing/normalization is unit-tested without hitting Twilio.
//
// NOTE: each lookup is a billable Twilio request (~$0.005). Admin-only.
// =============================================================================

import twilio from "twilio";

import { normalizePhoneToE164 } from "@/lib/onboarding/validation";

export type LineType = "mobile" | "landline" | "voip" | "other" | "unknown";

export interface LookupResult {
  input: string;
  e164: string | null;
  valid: boolean;
  lineType: LineType;
  /** The raw Twilio type string (e.g. "nonFixedVoip"), for display. */
  rawType: string | null;
  carrierName: string | null;
  error?: string;
}

/** The subset of the Twilio Lookup v2 response we read. */
export interface RawLookupResponse {
  valid?: boolean;
  lineTypeIntelligence?: {
    type?: string | null;
    carrier_name?: string | null;
    carrierName?: string | null;
  } | null;
}

export interface LookupDeps {
  fetchLookup: (e164: string) => Promise<RawLookupResponse>;
}

/** True when the Twilio credentials needed for Lookup are present. */
export function twilioLookupConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_API_KEY && process.env.TWILIO_API_SECRET);
}

function defaultDeps(): LookupDeps {
  return {
    fetchLookup: async (e164: string) => {
      const accountSid = process.env.TWILIO_ACCOUNT_SID as string;
      const apiKey = process.env.TWILIO_API_KEY as string;
      const apiSecret = process.env.TWILIO_API_SECRET as string;
      const client = twilio(apiKey, apiSecret, { accountSid });
      const res = await client.lookups.v2.phoneNumbers(e164).fetch({ fields: "line_type_intelligence" });
      return res as unknown as RawLookupResponse;
    },
  };
}

/** Map Twilio's `type` string to our normalized line type. */
export function normalizeLineType(rawType: string | null | undefined): LineType {
  const t = (rawType ?? "").toLowerCase();
  if (!t) return "unknown";
  if (t === "mobile") return "mobile";
  if (t === "landline") return "landline";
  if (t.includes("voip")) return "voip"; // fixedVoip, nonFixedVoip
  return "other"; // tollFree, premium, etc.
}

/** Look up a single number's line type. Never throws — errors are captured. */
export async function lookupLineType(rawInput: string, deps: LookupDeps = defaultDeps()): Promise<LookupResult> {
  const input = rawInput.trim();
  const e164 = normalizePhoneToE164(input);
  if (!e164) {
    return { input, e164: null, valid: false, lineType: "unknown", rawType: null, carrierName: null, error: "Not a valid phone number." };
  }
  try {
    const res = await deps.fetchLookup(e164);
    const lti = res.lineTypeIntelligence ?? null;
    const rawType = lti?.type ?? null;
    return {
      input,
      e164,
      valid: res.valid ?? true,
      lineType: normalizeLineType(rawType),
      rawType,
      carrierName: lti?.carrier_name ?? lti?.carrierName ?? null,
    };
  } catch (err) {
    return {
      input,
      e164,
      valid: false,
      lineType: "unknown",
      rawType: null,
      carrierName: null,
      error: err instanceof Error ? err.message.slice(0, 200) : "Lookup failed.",
    };
  }
}

/** Max numbers processed per request (cost + serverless time guard). */
export const LOOKUP_BATCH_MAX = 50;

/** Split a pasted blob into candidate numbers (newline/comma/semicolon separated). */
export function parseNumberList(blob: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of blob.split(/[\n,;]+/)) {
    const v = piece.trim();
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

/** Look up many numbers (deduped, capped). Runs with small concurrency. */
export async function lookupMany(inputs: string[], deps: LookupDeps = defaultDeps(), max: number = LOOKUP_BATCH_MAX): Promise<LookupResult[]> {
  const list = inputs.slice(0, max);
  const results: LookupResult[] = [];
  const CONCURRENCY = 5;
  for (let i = 0; i < list.length; i += CONCURRENCY) {
    const batch = list.slice(i, i + CONCURRENCY);
    results.push(...(await Promise.all(batch.map((n) => lookupLineType(n, deps)))));
  }
  return results;
}
