import { Resend } from "resend";
import type { Client, ClientSettings, Lead } from "./types";
import { businessName } from "./types";
import { formatMoney } from "./analytics";
import { buildReviewMessage } from "./review";

// Sends a Google review request to a past customer. Fails soft. Returns true
// only if the email was actually sent.
export async function sendReviewRequestEmail(
  client: Client,
  settings: ClientSettings | null,
  lead: Lead
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.LEAD_NOTIFICATION_FROM;
  if (!apiKey || !from) {
    console.warn("[email] Resend not configured — skipping review request");
    return false;
  }
  if (!lead.email) return false;

  const resend = new Resend(apiKey);
  const business = businessName(client, settings);
  const message = buildReviewMessage(client, settings, lead);
  const link = settings?.google_review_link ?? "";

  try {
    await resend.emails.send({
      from,
      to: lead.email,
      // Reply-to the client so the customer can reach the actual business.
      ...(settings?.email ? { replyTo: settings.email } : {}),
      subject: `Quick favor — a review for ${business}?`,
      html: renderReviewEmail(business, message, link),
    });
    return true;
  } catch (err) {
    console.error("[email] failed to send review request", err);
    return false;
  }
}

function renderReviewEmail(business: string, message: string, link: string) {
  return `
  <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
    <p style="color:#111827;font-size:15px;line-height:1.6">${escapeHtml(message)}</p>
    ${
      link
        ? `<p style="margin:24px 0"><a href="${escapeHtml(link)}" style="background:#1e3a8a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block">Leave a Google Review</a></p>`
        : ""
    }
    <p style="color:#9ca3af;font-size:12px;margin-top:24px">Thank you from ${escapeHtml(business)}.</p>
  </div>`;
}

// Sends a "new lead" notification to the business. Fails soft: if Resend isn't
// configured or the send errors, we log and continue — a missed email should
// never block lead capture.
export async function sendNewLeadEmail(
  client: Client,
  settings: ClientSettings | null,
  lead: Lead
) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.LEAD_NOTIFICATION_FROM;
  const to = settings?.email;
  // Steel Scale's own inbox, silently copied on every client's leads.
  const agencyBcc = process.env.AGENCY_NOTIFICATION_EMAIL;

  if (!apiKey || !from) {
    console.warn("[email] RESEND_API_KEY / LEAD_NOTIFICATION_FROM not set — skipping notification");
    return;
  }
  if (!to) {
    console.warn(`[email] client ${client.id} has no notification email — skipping`);
    return;
  }

  const resend = new Resend(apiKey);
  const business = businessName(client, settings);

  try {
    await resend.emails.send({
      from,
      to,
      ...(agencyBcc ? { bcc: agencyBcc } : {}),
      subject: `New lead for ${business}: ${lead.name}`,
      html: renderLeadEmail(business, lead),
    });
  } catch (err) {
    console.error("[email] failed to send new lead notification", err);
  }
}

function renderLeadEmail(business: string, lead: Lead) {
  const rows = [
    ["Name", lead.name],
    ["Phone", lead.phone],
    ["Email", lead.email],
    ["Service", lead.service_needed],
    ["Budget", lead.estimate_value != null ? formatMoney(lead.estimate_value) : null],
    ["Source", lead.source],
    ["Message", lead.message],
  ]
    .filter(([, v]) => v)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px;font-weight:600;color:#374151">${label}</td><td style="padding:6px 12px;color:#111827">${escapeHtml(
          String(value)
        )}</td></tr>`
    )
    .join("");

  return `
  <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#111827">New lead for ${escapeHtml(business)}</h2>
    <p style="color:#6b7280">A new lead just came in through your website.</p>
    <table style="border-collapse:collapse;background:#f9fafb;border-radius:8px;width:100%">${rows}</table>
    <p style="color:#9ca3af;font-size:12px;margin-top:24px">Sent by Steel Scale Systems</p>
  </div>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
