// =============================================================================
// GHL client onboarding — application-layer validation.
//
// Email/URL validation, follow-up + review-limit ranges (mirroring the DB
// CHECK constraints), phone normalization, and the email-sending-domain
// derivation. Pure functions + a zod schema — no UI, no GHL calls.
// =============================================================================

import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js";

// Must match the DB CHECK constraints in migration 0029.
export const FOLLOW_UP_MIN = 0;
export const FOLLOW_UP_MAX = 3;
export const REVIEW_REQUEST_LIMIT_MIN = 0;
export const REVIEW_REQUEST_LIMIT_MAX = 500;

const DEFAULT_REGION = "US";

/** Normalize a phone to E.164, or null if it isn't valid. */
export function normalizePhoneToE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const parsed = parsePhoneNumberFromString(raw.trim(), DEFAULT_REGION);
  return parsed && parsed.isValid() ? parsed.number : null;
}

/**
 * Derive the email sending domain from a website URL: the hostname with any
 * leading "www." stripped (e.g. https://www.smiledental.com/x → smiledental.com).
 * Returns null if the URL can't be parsed. Admin can override the result.
 */
export function deriveEmailSendingDomain(website: string | null | undefined): string | null {
  if (!website) return null;
  const raw = website.trim();
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const host = new URL(withScheme).hostname.toLowerCase();
    return host.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

// The client-submitted onboarding payload (subset of client_accounts the client
// fills in). email_sending_domain and status are derived/managed by the system.
export const onboardingSubmissionSchema = z.object({
  legal_business_name: z.string().trim().min(1, "legal_business_name is required"),
  public_business_name: z.string().trim().min(1, "public_business_name is required"),
  owner_first_name: z.string().trim().min(1, "owner_first_name is required"),
  primary_email: z.string().trim().email("primary_email must be a valid email"),
  primary_phone: z
    .string()
    .trim()
    .min(1, "primary_phone is required")
    .refine((v) => normalizePhoneToE164(v) !== null, "primary_phone is not a valid phone number"),
  website_url: z.string().trim().url("website_url must be a valid URL"),
  address_line_1: z.string().trim().optional(),
  address_line_2: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  postal_code: z.string().trim().optional(),
  country: z.string().trim().optional(),
  timezone: z.string().trim().min(1, "timezone is required"),
  google_review_link: z.string().trim().url("google_review_link must be a valid URL"),
  logo_url: z.string().trim().url("logo_url must be a valid URL").optional(),
  primary_brand_color: z
    .string()
    .trim()
    .regex(/^#?[0-9a-fA-F]{6}$/, "primary_brand_color must be a hex color")
    .optional(),
  follow_up_count: z.number().int().min(FOLLOW_UP_MIN).max(FOLLOW_UP_MAX),
  review_request_limit_14_days: z.number().int().min(REVIEW_REQUEST_LIMIT_MIN).max(REVIEW_REQUEST_LIMIT_MAX),
  ask_for_referral: z.boolean(),
});

export type OnboardingSubmissionInput = z.infer<typeof onboardingSubmissionSchema>;

export interface ValidationIssue {
  field: string;
  message: string;
}

export type ValidationResult =
  | { ok: true; data: OnboardingSubmissionInput & { primary_phone_e164: string; email_sending_domain: string | null } }
  | { ok: false; issues: ValidationIssue[] };

/**
 * Validate a raw onboarding submission and produce a normalized record
 * (E.164 phone + derived email domain). Persistence happens elsewhere.
 */
export function validateOnboardingSubmission(raw: unknown): ValidationResult {
  const parsed = onboardingSubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    };
  }
  const data = parsed.data;
  return {
    ok: true,
    data: {
      ...data,
      // Non-null: the schema refine already guaranteed a valid number.
      primary_phone_e164: normalizePhoneToE164(data.primary_phone) as string,
      email_sending_domain: deriveEmailSendingDomain(data.website_url),
    },
  };
}
