import type { Client, ClientSettings, Lead } from "./types";
import { businessName } from "./types";

// Builds a friendly, prefilled review-request message pointing the customer at
// the client's Google review link.
export function buildReviewMessage(
  client: Client,
  settings: ClientSettings | null,
  lead?: Lead | null
): string {
  const business = businessName(client, settings);
  const customerName = lead?.name?.trim() || "there";
  const firstName = customerName.split(/\s+/)[0] || "there";
  const link = settings?.google_review_link ?? "";

  // If the client wrote a custom message, fill in its placeholders.
  const custom = settings?.review_request_message?.trim();
  if (custom) {
    return custom
      .replace(/\{\{\s*name\s*\}\}/gi, firstName)
      .replace(/\{\{\s*business\s*\}\}/gi, business)
      .replace(/\{\{\s*link\s*\}\}/gi, link)
      .trim();
  }

  return (
    `Hi ${firstName}, thank you for choosing ${business}. ` +
    `If you were happy with the work, would you mind leaving us a quick Google review? ` +
    `It really helps our local business: ${link}`
  );
}

// Convenience link for opening the customer's SMS app with the message
// prefilled (mobile-friendly).
export function buildSmsHref(phone: string | null | undefined, message: string): string {
  const body = encodeURIComponent(message);
  const number = (phone ?? "").replace(/[^\d+]/g, "");
  return `sms:${number}?&body=${body}`;
}

// Convenience link for opening the user's email client with the review request
// prefilled (to the customer, with a subject line).
export function buildEmailHref(
  email: string | null | undefined,
  subject: string,
  message: string
): string {
  const params = new URLSearchParams({ subject, body: message });
  return `mailto:${email ?? ""}?${params.toString()}`;
}
