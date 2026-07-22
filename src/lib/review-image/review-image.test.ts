import { describe, it, expect, beforeAll } from "vitest";

import { applyNameTemplate, shouldAttachImage, type ReviewImageConfig } from "@/lib/review-image";
import { signReviewImage, verifyReviewImage, buildReviewImageUrl, reviewImageSigningConfigured } from "@/lib/review-image/sign";

beforeAll(() => {
  process.env.REVIEW_IMAGE_SIGNING_SECRET = "test-signing-secret-abcdef, 32 bytes+";
});

const config = (over: Partial<ReviewImageConfig> = {}): ReviewImageConfig => ({
  enabled: true,
  baseImageUrl: "https://cdn.test/base.png",
  baseImagePath: "review-image/acc_1/base.png",
  nameTemplate: "Thanks, {name}!",
  textColor: "#FFFFFF",
  fontSize: 72,
  textPosition: "bottom",
  ...over,
});

describe("applyNameTemplate", () => {
  it("substitutes {name} (case-insensitive)", () => {
    expect(applyNameTemplate("Thanks, {name}!", "Dana")).toBe("Thanks, Dana!");
    expect(applyNameTemplate("Hi {NAME}", "Dana")).toBe("Hi Dana");
  });
  it("falls back to the bare name when there is no placeholder", () => {
    expect(applyNameTemplate("no placeholder", "Dana")).toBe("Dana");
    expect(applyNameTemplate("", "Dana")).toBe("Dana");
  });
});

describe("shouldAttachImage", () => {
  it("attaches on the first two stages when enabled", () => {
    expect(shouldAttachImage("review_request.initial", config())).toBe(true);
    expect(shouldAttachImage("review_request.follow_up_1", config())).toBe(true);
  });
  it("does not attach on later stages", () => {
    expect(shouldAttachImage("review_request.follow_up_2", config())).toBe(false);
    expect(shouldAttachImage("review_request.follow_up_3", config())).toBe(false);
  });
  it("does not attach when disabled, missing image, or no config", () => {
    expect(shouldAttachImage("review_request.initial", config({ enabled: false }))).toBe(false);
    expect(shouldAttachImage("review_request.initial", config({ baseImageUrl: null }))).toBe(false);
    expect(shouldAttachImage("review_request.initial", null)).toBe(false);
  });
});

describe("signing", () => {
  it("reports configured when a secret is present", () => {
    expect(reviewImageSigningConfigured()).toBe(true);
  });

  it("verifies a valid signature and rejects tampering", () => {
    const sig = signReviewImage("acc_1", "Dana");
    expect(verifyReviewImage("acc_1", "Dana", sig)).toBe(true);
    // Different name / client / signature all fail.
    expect(verifyReviewImage("acc_1", "Evil", sig)).toBe(false);
    expect(verifyReviewImage("acc_2", "Dana", sig)).toBe(false);
    expect(verifyReviewImage("acc_1", "Dana", "deadbeef")).toBe(false);
    expect(verifyReviewImage("acc_1", "Dana", null)).toBe(false);
  });

  it("builds a signed absolute URL that verifies", () => {
    const url = new URL(buildReviewImageUrl("https://www.steelscale.xyz/", "acc_1", "Dana"));
    expect(url.pathname).toBe("/api/media/review-image");
    expect(url.searchParams.get("c")).toBe("acc_1");
    expect(url.searchParams.get("n")).toBe("Dana");
    expect(verifyReviewImage("acc_1", "Dana", url.searchParams.get("sig"))).toBe(true);
  });
});
