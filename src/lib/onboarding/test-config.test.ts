import { describe, it, expect } from "vitest";

import { buildTestChecklist, requiredMergeFields, type TestConfigFacts } from "@/lib/onboarding/test-config";

const allGood: TestConfigFacts = {
  credentialEnabled: true,
  secretProvided: false,
  secretMatches: false,
  locationId: "loc_1",
  clientActive: true,
  hasReviewLink: true,
  twilioConfigured: true,
};

describe("buildTestChecklist", () => {
  it("passes when everything is configured (no secret supplied)", () => {
    const { passed, items } = buildTestChecklist(allGood);
    expect(passed).toBe(true);
    expect(items.map((i) => i.key)).toEqual(["secret", "location", "merge_fields", "client_active", "review_link", "twilio"]);
  });

  it("fails secret check when a supplied secret does not match", () => {
    const { passed, items } = buildTestChecklist({ ...allGood, secretProvided: true, secretMatches: false });
    expect(passed).toBe(false);
    expect(items.find((i) => i.key === "secret")!.ok).toBe(false);
  });

  it("passes secret check when the supplied secret matches", () => {
    const { items } = buildTestChecklist({ ...allGood, secretProvided: true, secretMatches: true });
    expect(items.find((i) => i.key === "secret")!.ok).toBe(true);
  });

  it("flags a missing location, inactive client, and unconfigured messaging", () => {
    const { passed, items } = buildTestChecklist({ ...allGood, locationId: null, clientActive: false, twilioConfigured: false });
    expect(passed).toBe(false);
    expect(items.find((i) => i.key === "location")!.ok).toBe(false);
    expect(items.find((i) => i.key === "client_active")!.ok).toBe(false);
    expect(items.find((i) => i.key === "twilio")!.ok).toBe(false);
  });

  it("lists the contact merge fields the payloads require", () => {
    const fields = requiredMergeFields();
    expect(fields).toContain("{{contact.first_name}}");
    expect(fields).toContain("{{location.id}}");
    expect(fields).toContain("{{contact.phone}}");
  });
});
