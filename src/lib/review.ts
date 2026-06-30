import type { Client, Lead } from "./types";

// Builds a friendly, prefilled review-request message pointing the customer at
// the client's Google review link.
export function buildReviewMessage(client: Client, lead?: Lead | null): string {
  const business = client.business_name;
  const firstName = lead?.name?.split(" ")[0];
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
  const link = client.google_review_link ?? "";

  return (
    `${greeting}\n\n` +
    `Thanks so much for choosing ${business}! It was a pleasure working with you. ` +
    `If you have a moment, we'd really appreciate a quick Google review — it helps our small business a lot.\n\n` +
    `${link}\n\n` +
    `Thank you!\n${business}`
  );
}

// Convenience link for opening the customer's SMS app with the message
// prefilled (mobile-friendly).
export function buildSmsHref(phone: string | null | undefined, message: string): string {
  const body = encodeURIComponent(message);
  const number = (phone ?? "").replace(/[^\d+]/g, "");
  return `sms:${number}?&body=${body}`;
}
