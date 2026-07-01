import { Resend } from "resend";
import type { Client, ClientSettings, Lead } from "./types";
import { businessName } from "./types";
import { formatMoney } from "./analytics";

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
