import { describe, it, expect } from "vitest";

import { matchMapping, normalizeName, expectedValueFor } from "@/lib/onboarding/provisioning/matching";
import type { CustomValueMappingRow } from "@/lib/onboarding/provisioning/types";
import type { CustomValue } from "@/lib/ghl/types";
import type { ClientAccount } from "@/lib/onboarding/types";

const values: CustomValue[] = [
  { id: "cv_id_match", name: "By Id", key: "some_key", value: "v1" },
  { id: "cv_key", name: "By Key", key: "google_review_link", value: "v2" },
  { id: "cv_name", name: "Business Name", key: "unrelated_key", value: "v3" },
  { id: "cv_legacy", name: "Legacy", key: "service_type", value: "v4" },
];

function mapping(over: Partial<CustomValueMappingRow>): CustomValueMappingRow {
  return { canonical_key: "google_review_link", expected_ghl_key: null, expected_display_name: null, ghl_custom_value_id: null, required: true, value_type: "string", ...over };
}

describe("matchMapping precedence", () => {
  it("1) matches a previously configured exact custom-value id first", () => {
    const res = matchMapping(mapping({ ghl_custom_value_id: "cv_id_match", expected_ghl_key: "google_review_link" }), values);
    expect(res.ok && res.match.method).toBe("configured_id");
  });
  it("2) matches an exact key", () => {
    const res = matchMapping(mapping({ expected_ghl_key: "google_review_link" }), values);
    expect(res.ok && res.match.customValueId).toBe("cv_key");
    expect(res.ok && res.match.method).toBe("key");
  });
  it("3) matches an exact normalized display name", () => {
    const res = matchMapping(mapping({ canonical_key: "business_name", expected_display_name: "business name" }), values);
    expect(res.ok && res.match.customValueId).toBe("cv_name");
    expect(res.ok && res.match.method).toBe("display_name");
  });
  it("4) matches an explicit legacy alias", () => {
    const res = matchMapping(mapping({ canonical_key: "follow_up_count", expected_ghl_key: "nope", legacy_aliases: ["service_type"] }), values);
    expect(res.ok && res.match.customValueId).toBe("cv_legacy");
    expect(res.ok && res.match.method).toBe("legacy_alias");
  });
  it("5) never fuzzy-matches — returns unmatched", () => {
    const res = matchMapping(mapping({ expected_ghl_key: "goggle_review", expected_display_name: "Goggle" }), values);
    expect(res.ok).toBe(false);
  });
});

describe("normalizeName", () => {
  it("is case/space/punctuation insensitive", () => {
    expect(normalizeName("  Google  Review-Link! ")).toBe("google review link");
  });
});

describe("expectedValueFor", () => {
  const client = {
    google_review_link: "https://g.page/r/x/review",
    logo_url: "https://cdn/x.png",
    owner_first_name: "Dana",
    public_business_name: "Acme",
    email_sending_domain: "acme.com",
    review_request_limit_14_days: 8,
    follow_up_count: 2,
    ask_for_referral: false,
  } as ClientAccount;

  it("formats values the review workflow expects", () => {
    expect(expectedValueFor("google_review_link", client)).toBe("https://g.page/r/x/review");
    expect(expectedValueFor("business_name", client)).toBe("Acme");
    expect(expectedValueFor("minimum_review_requests_per_14_days", client)).toBe("8");
    expect(expectedValueFor("follow_up_count", client)).toBe("2");
    expect(expectedValueFor("review_requests_per_14_days", client)).toBe("0");
    expect(expectedValueFor("ask_for_referral", client)).toBe("No");
  });

  it("does not invent a url for text_1_image_link", () => {
    expect(expectedValueFor("text_1_image_link", client)).toBeNull();
    expect(expectedValueFor("text_1_image_link", client, { textImagePlaceholder: "https://cdn/ph.png" })).toBe("https://cdn/ph.png");
  });
});
