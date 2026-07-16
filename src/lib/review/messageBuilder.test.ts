import { describe, it, expect } from "vitest";
import { buildReviewMessage } from "@/lib/review/messageBuilder";

describe("buildReviewMessage", () => {
  it("builds the review-request SMS body", () => {
    const msg = buildReviewMessage({
      firstName: "John",
      businessName: "Smile Dental",
      reviewLink: "https://g.page/r/abc/review",
    });
    expect(msg).toBe(
      "Hi John,\n\n" +
        "Thanks for choosing Smile Dental.\n\n" +
        "Would you mind leaving us a quick review?\n\n" +
        "https://g.page/r/abc/review\n\n" +
        "Reply STOP to opt out."
    );
  });
});
