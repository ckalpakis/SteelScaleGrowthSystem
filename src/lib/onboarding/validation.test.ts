import { describe, it, expect } from "vitest";
import {
  validateOnboardingSubmission,
  normalizePhoneToE164,
  deriveEmailSendingDomain,
  REVIEW_REQUEST_LIMIT_MAX,
} from "@/lib/onboarding/validation";

const base = {
  legal_business_name: "Smile Dental LLC",
  public_business_name: "Smile Dental",
  owner_first_name: "Marc",
  primary_email: "marc@smiledental.com",
  primary_phone: "(412) 555-1234",
  website_url: "https://www.smiledental.com",
  timezone: "America/New_York",
  google_review_link: "https://g.page/r/abc/review",
  follow_up_count: 2,
  review_request_limit_14_days: 50,
  ask_for_referral: true,
};

describe("normalizePhoneToE164", () => {
  it("normalizes US numbers", () => {
    expect(normalizePhoneToE164("(412) 555-1234")).toBe("+14125551234");
    expect(normalizePhoneToE164("+14125551234")).toBe("+14125551234");
  });
  it("returns null for invalid", () => {
    expect(normalizePhoneToE164("abc")).toBeNull();
    expect(normalizePhoneToE164("")).toBeNull();
  });
});

describe("deriveEmailSendingDomain", () => {
  it("strips scheme + www", () => {
    expect(deriveEmailSendingDomain("https://www.smiledental.com/x")).toBe("smiledental.com");
    expect(deriveEmailSendingDomain("smiledental.com")).toBe("smiledental.com");
  });
  it("returns null for empty/garbage", () => {
    expect(deriveEmailSendingDomain(null)).toBeNull();
    expect(deriveEmailSendingDomain("not a url with spaces")).toBeNull();
  });
});

describe("validateOnboardingSubmission", () => {
  it("accepts a valid submission and normalizes phone + email domain", () => {
    const res = validateOnboardingSubmission(base);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.primary_phone_e164).toBe("+14125551234");
      expect(res.data.email_sending_domain).toBe("smiledental.com");
    }
  });

  it("enforces follow_up_count range 0..3", () => {
    expect(validateOnboardingSubmission({ ...base, follow_up_count: 0 }).ok).toBe(true);
    expect(validateOnboardingSubmission({ ...base, follow_up_count: 3 }).ok).toBe(true);
    expect(validateOnboardingSubmission({ ...base, follow_up_count: 4 }).ok).toBe(false);
    expect(validateOnboardingSubmission({ ...base, follow_up_count: -1 }).ok).toBe(false);
  });

  it("enforces review_request_limit range", () => {
    expect(validateOnboardingSubmission({ ...base, review_request_limit_14_days: 0 }).ok).toBe(true);
    expect(validateOnboardingSubmission({ ...base, review_request_limit_14_days: REVIEW_REQUEST_LIMIT_MAX }).ok).toBe(true);
    expect(validateOnboardingSubmission({ ...base, review_request_limit_14_days: REVIEW_REQUEST_LIMIT_MAX + 1 }).ok).toBe(false);
    expect(validateOnboardingSubmission({ ...base, review_request_limit_14_days: -1 }).ok).toBe(false);
  });

  it("rejects invalid email / urls / phone", () => {
    expect(validateOnboardingSubmission({ ...base, primary_email: "nope" }).ok).toBe(false);
    expect(validateOnboardingSubmission({ ...base, google_review_link: "not-a-url" }).ok).toBe(false);
    expect(validateOnboardingSubmission({ ...base, website_url: "not-a-url" }).ok).toBe(false);
    expect(validateOnboardingSubmission({ ...base, primary_phone: "123" }).ok).toBe(false);
  });

  it("reports field-level issues", () => {
    const res = validateOnboardingSubmission({ ...base, primary_email: "x", follow_up_count: 9 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      const fields = res.issues.map((i) => i.field);
      expect(fields).toContain("primary_email");
      expect(fields).toContain("follow_up_count");
    }
  });
});
