import { describe, it, expect } from "vitest";
import {
  CANONICAL_CUSTOM_VALUE_KEYS,
  CANONICAL_CUSTOM_VALUE_MAP,
  PROVISIONING_STEP_KEYS,
  PROVISIONING_RUN_STATUSES,
  CLIENT_ACCOUNT_STATUSES,
  isOneOf,
} from "@/lib/onboarding/types";

describe("canonical custom-value keys", () => {
  it("has exactly the 10 required keys", () => {
    expect(CANONICAL_CUSTOM_VALUE_KEYS).toHaveLength(10);
    expect(new Set(CANONICAL_CUSTOM_VALUE_KEYS).size).toBe(10);
    for (const k of [
      "google_review_link",
      "logo_link",
      "text_1_image_link",
      "business_owner_name",
      "business_name",
      "email_sending_domain",
      "minimum_review_requests_per_14_days",
      "follow_up_count",
      "review_requests_per_14_days",
      "ask_for_referral",
    ]) {
      expect(CANONICAL_CUSTOM_VALUE_KEYS).toContain(k);
    }
  });

  it("maps every canonical key exactly once", () => {
    expect(CANONICAL_CUSTOM_VALUE_MAP).toHaveLength(CANONICAL_CUSTOM_VALUE_KEYS.length);
    const keys = CANONICAL_CUSTOM_VALUE_MAP.map((m) => m.canonical_key).sort();
    expect(keys).toEqual([...CANONICAL_CUSTOM_VALUE_KEYS].sort());
  });

  it("encodes the legacy GHL key names + mapping rules", () => {
    const byKey = Object.fromEntries(CANONICAL_CUSTOM_VALUE_MAP.map((m) => [m.canonical_key, m]));
    // follow-up count is stored in the legacy "service_type" custom value.
    expect(byKey.follow_up_count.expected_ghl_key).toBe("service_type");
    expect(byKey.email_sending_domain.expected_ghl_key).toBe("9_email_sending_subdomain_after_the_");
    expect(byKey.ask_for_referral.expected_ghl_key).toBe(
      "10_ask_for_a_referral_if_customer_has_already_left_a_review_yes_or_no"
    );
    // text_1_image_link may remain blank → optional.
    expect(byKey.text_1_image_link.required).toBe(false);
    // review_requests_per_14_days is system-managed but must exist.
    expect(byKey.review_requests_per_14_days.required).toBe(true);
  });
});

describe("provisioning step keys", () => {
  it("are the 9 required steps in order", () => {
    expect(PROVISIONING_STEP_KEYS).toEqual([
      "validate_submission",
      "create_ghl_location",
      "obtain_location_token",
      "apply_snapshot",
      "discover_custom_values",
      "update_custom_values",
      "create_webhook_credential",
      "run_health_checks",
      "finalize",
    ]);
  });
});

describe("status helpers", () => {
  it("isOneOf guards membership", () => {
    expect(isOneOf(PROVISIONING_RUN_STATUSES, "needs_action")).toBe(true);
    expect(isOneOf(PROVISIONING_RUN_STATUSES, "bogus")).toBe(false);
    expect(isOneOf(CLIENT_ACCOUNT_STATUSES, "active")).toBe(true);
  });
});
