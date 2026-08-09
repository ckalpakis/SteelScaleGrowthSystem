// =============================================================================
// Message builder — turns review parameters into the SMS body. Pure function,
// no side effects, trivially testable.
// =============================================================================

import type { ReviewMessageParams } from "@/lib/review/types";

/** Build the review-request SMS body from the customer + business details. */
export function buildReviewMessage({ firstName, businessName, reviewLink }: ReviewMessageParams): string {
  return (
    `Hi ${firstName},\n\n` +
    `Thanks for choosing ${businessName}.\n\n` +
    `Would you mind leaving us a quick review?\n\n` +
    `${reviewLink}\n\n` +
    `Reply STOP to opt out.`
  );
}
