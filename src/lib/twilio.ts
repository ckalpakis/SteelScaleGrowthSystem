import { createHmac, timingSafeEqual } from "crypto";
import twilio from "twilio";
import type { SupabaseClient } from "@supabase/supabase-js";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { toE164 } from "@/lib/sms";

// =============================================================================
// Per-company Twilio integration. Server-only.
//
// Credentials live in company_twilio_credentials (auth token encrypted at rest)
// and are only ever read with the service-role client. Nothing here should be
// imported from client components.
// =============================================================================

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  messagingServiceSid: string | null;
  phoneNumber: string | null;
}

// Non-secret view of a company's Twilio config, safe to send to the frontend.
export interface TwilioConfigSummary {
  configured: boolean;
  accountSid: string | null;
  messagingServiceSid: string | null;
  phoneNumber: string | null;
  isActive: boolean;
}

// The public base URL used to build webhook / status-callback URLs.
export function appBaseUrl(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  return raw ? raw.replace(/\/$/, "") : null;
}

// ---------------------------------------------------------------- credentials
export async function getCompanyTwilio(
  admin: SupabaseClient,
  companyId: string
): Promise<TwilioCredentials | null> {
  const { data } = await admin
    .from("company_twilio_credentials")
    .select("account_sid, messaging_service_sid, phone_number, auth_token_encrypted, is_active")
    .eq("company_id", companyId)
    .maybeSingle<{
      account_sid: string;
      messaging_service_sid: string | null;
      phone_number: string | null;
      auth_token_encrypted: string;
      is_active: boolean;
    }>();

  if (!data || !data.is_active) return null;

  let authToken: string;
  try {
    authToken = decryptSecret(data.auth_token_encrypted);
  } catch {
    console.error("[twilio] failed to decrypt auth token for company", companyId);
    return null;
  }

  return {
    accountSid: data.account_sid,
    authToken,
    messagingServiceSid: data.messaging_service_sid,
    phoneNumber: data.phone_number,
  };
}

// Resolve which company owns an inbound/destination Twilio number.
export async function getCompanyByTwilioNumber(
  admin: SupabaseClient,
  toNumber: string
): Promise<{ companyId: string; creds: TwilioCredentials } | null> {
  const normalized = toE164(toNumber) ?? toNumber;
  const { data } = await admin
    .from("company_twilio_credentials")
    .select("company_id, account_sid, messaging_service_sid, phone_number, auth_token_encrypted, is_active")
    .eq("phone_number", normalized)
    .maybeSingle<{
      company_id: string;
      account_sid: string;
      messaging_service_sid: string | null;
      phone_number: string | null;
      auth_token_encrypted: string;
      is_active: boolean;
    }>();

  if (!data || !data.is_active) return null;
  try {
    return {
      companyId: data.company_id,
      creds: {
        accountSid: data.account_sid,
        authToken: decryptSecret(data.auth_token_encrypted),
        messagingServiceSid: data.messaging_service_sid,
        phoneNumber: data.phone_number,
      },
    };
  } catch {
    return null;
  }
}

export interface SaveTwilioInput {
  accountSid: string;
  authToken?: string | null; // optional on update — omit to keep the existing token
  messagingServiceSid?: string | null;
  phoneNumber?: string | null;
  isActive?: boolean;
}

// Upsert a company's Twilio credentials. Encrypts the auth token before storing.
export async function saveCompanyTwilio(
  admin: SupabaseClient,
  companyId: string,
  input: SaveTwilioInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const accountSid = input.accountSid.trim();
  if (!/^AC[0-9a-fA-F]{32}$/.test(accountSid)) {
    return { ok: false, error: "Account SID should look like AC followed by 32 characters." };
  }

  const phoneNumber = input.phoneNumber ? toE164(input.phoneNumber) : null;
  if (input.phoneNumber && !phoneNumber) {
    return { ok: false, error: "Enter a valid phone number, e.g. +14125551234." };
  }

  const messagingServiceSid = input.messagingServiceSid?.trim() || null;
  if (messagingServiceSid && !/^MG[0-9a-fA-F]{32}$/.test(messagingServiceSid)) {
    return { ok: false, error: "Messaging Service SID should look like MG followed by 32 characters." };
  }
  if (!messagingServiceSid && !phoneNumber) {
    return { ok: false, error: "Provide a Messaging Service SID or a phone number to send from." };
  }

  // Load any existing row so we can keep the token when it isn't being changed.
  const { data: existing } = await admin
    .from("company_twilio_credentials")
    .select("id, auth_token_encrypted")
    .eq("company_id", companyId)
    .maybeSingle<{ id: string; auth_token_encrypted: string }>();

  const newToken = input.authToken?.trim();
  let authTokenEncrypted: string;
  if (newToken) {
    authTokenEncrypted = encryptSecret(newToken);
  } else if (existing) {
    authTokenEncrypted = existing.auth_token_encrypted;
  } else {
    return { ok: false, error: "Auth token is required." };
  }

  const row = {
    company_id: companyId,
    account_sid: accountSid,
    messaging_service_sid: messagingServiceSid,
    phone_number: phoneNumber,
    auth_token_encrypted: authTokenEncrypted,
    is_active: input.isActive ?? true,
  };

  const { error } = existing
    ? await admin.from("company_twilio_credentials").update(row).eq("company_id", companyId)
    : await admin.from("company_twilio_credentials").insert(row);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getTwilioSummary(
  admin: SupabaseClient,
  companyId: string
): Promise<TwilioConfigSummary> {
  const { data } = await admin
    .from("company_twilio_credentials")
    .select("account_sid, messaging_service_sid, phone_number, is_active")
    .eq("company_id", companyId)
    .maybeSingle<{
      account_sid: string;
      messaging_service_sid: string | null;
      phone_number: string | null;
      is_active: boolean;
    }>();

  return {
    configured: Boolean(data),
    accountSid: data?.account_sid ?? null,
    messagingServiceSid: data?.messaging_service_sid ?? null,
    phoneNumber: data?.phone_number ?? null,
    isActive: data?.is_active ?? false,
  };
}

// ---------------------------------------------------------------- sending
export interface SendResult {
  ok: boolean;
  sid?: string;
  status?: string;
  error?: string;
  code?: number;
}

export async function sendTwilioSms(
  creds: TwilioCredentials,
  opts: { to: string; body: string; statusCallback?: string | null }
): Promise<SendResult> {
  const dest = toE164(opts.to);
  if (!dest) return { ok: false, error: "Invalid destination number." };

  const params = new URLSearchParams();
  params.set("To", dest);
  params.set("Body", opts.body);
  // Prefer the Messaging Service (handles number pools, compliance) when set.
  if (creds.messagingServiceSid) {
    params.set("MessagingServiceSid", creds.messagingServiceSid);
  } else if (creds.phoneNumber) {
    params.set("From", creds.phoneNumber);
  } else {
    return { ok: false, error: "No Messaging Service SID or from number configured." };
  }
  if (opts.statusCallback) params.set("StatusCallback", opts.statusCallback);

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    const json = (await res.json().catch(() => ({}))) as {
      sid?: string;
      status?: string;
      message?: string;
      code?: number;
    };

    if (!res.ok) {
      return { ok: false, error: json.message ?? `Twilio error ${res.status}`, code: json.code };
    }
    return { ok: true, sid: json.sid, status: json.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Twilio request failed." };
  }
}

// ---------------------------------------------------------------- webhooks
// Validate an incoming Twilio webhook signature (best practice — reject spoofed
// requests). Signature = base64(HMAC-SHA1(url + sorted param key/values)).
export function validateTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string | null
): boolean {
  if (!signature) return false;
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  const expected = createHmac("sha1", authToken).update(Buffer.from(data, "utf8")).digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Twilio delivery statuses map 1:1 onto our review_messages status set; this
// clamps anything unexpected to a safe default.
const KNOWN_STATUSES = new Set([
  "queued",
  "sending",
  "sent",
  "delivered",
  "undelivered",
  "failed",
  "received",
  "read",
  "accepted",
]);

export function normalizeTwilioStatus(status: string | null | undefined): string {
  const s = (status ?? "").toLowerCase();
  return KNOWN_STATUSES.has(s) ? s : "queued";
}

// Flatten a webhook's form body into the string map used for signature checks.
export async function readTwilioForm(request: Request): Promise<Record<string, string>> {
  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") params[key] = value;
  }
  return params;
}

// The exact public URL Twilio signed. Prefer the configured base URL; fall back
// to the forwarded host/proto so signature validation works behind a proxy.
export function webhookUrl(request: Request, path: string): string {
  const base = appBaseUrl();
  if (base) return `${base}${path}`;
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  return `${proto}://${host}${path}`;
}

// Minimal empty TwiML response (200) — tells Twilio we handled the webhook and
// don't want to send an auto-reply from here.
export function emptyTwiml(): Response {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

// STOP / unsubscribe keywords Twilio Advanced Opt-Out also recognizes.
const STOP_KEYWORDS = new Set(["stop", "stopall", "unsubscribe", "cancel", "end", "quit"]);
export function isStopKeyword(body: string): boolean {
  return STOP_KEYWORDS.has(body.trim().toLowerCase());
}

// =============================================================================
// Review request sender (GoHighLevel → Twilio Messaging Service).
//
// Standalone path used by POST /api/review. Uses the Twilio SDK with API-key
// auth and sends via a Messaging Service SID (never a hard-coded `from`).
// Credentials come from the environment and never leave the server.
// =============================================================================

export interface SendReviewRequestInput {
  firstName: string;
  businessName: string;
  reviewLink: string;
  /** Destination phone in E.164 (caller normalizes it). */
  to: string;
}

export interface SendReviewRequestResult {
  messageSid: string;
  status: string;
}

/** Thrown when the required Twilio environment variables are not configured. */
export class TwilioConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TwilioConfigError";
  }
}

/** Build the review-request SMS body. */
export function buildReviewRequestMessage(firstName: string, businessName: string, reviewLink: string): string {
  return (
    `Hi ${firstName},\n\n` +
    `Thanks for choosing ${businessName}.\n\n` +
    `Would you mind leaving us a quick review?\n\n` +
    `${reviewLink}\n\n` +
    `Reply STOP to opt out.`
  );
}

/**
 * Send a review-request SMS through the Twilio Messaging Service.
 * Reads TWILIO_ACCOUNT_SID / TWILIO_API_KEY / TWILIO_API_SECRET /
 * TWILIO_MESSAGING_SERVICE_SID from the environment. Throws TwilioConfigError
 * if any is missing; rethrows Twilio/network errors for the caller to handle.
 */
export async function sendReviewRequest(input: SendReviewRequestInput): Promise<SendReviewRequestResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKey = process.env.TWILIO_API_KEY;
  const apiSecret = process.env.TWILIO_API_SECRET;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !apiKey || !apiSecret || !messagingServiceSid) {
    throw new TwilioConfigError(
      "Twilio is not configured (need TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, TWILIO_MESSAGING_SERVICE_SID)."
    );
  }

  const client = twilio(apiKey, apiSecret, { accountSid });
  const body = buildReviewRequestMessage(input.firstName, input.businessName, input.reviewLink);

  console.log("[review] sending SMS", {
    to: input.to,
    business: input.businessName,
    messagingServiceSid,
  });

  const message = await client.messages.create({ messagingServiceSid, to: input.to, body });

  console.log("[review] Twilio accepted", { messageSid: message.sid, status: message.status, to: input.to });

  return { messageSid: message.sid, status: message.status };
}
