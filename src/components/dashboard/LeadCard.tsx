import Link from "next/link";
import { StatusSelect } from "./StatusSelect";
import { ReviewRequestButton } from "./ReviewRequestButton";
import type { Client, ClientSettings, Lead } from "@/lib/types";
import { businessName } from "@/lib/types";
import { formatMoney } from "@/lib/analytics";
import { buildReviewMessage, buildSmsHref, buildEmailHref } from "@/lib/review";

// A single lead card. Used on the grouped board and the overview. Shows the
// key contact info at a glance; the status dropdown updates inline; clicking
// the name opens the detail page; and a compact review-request action lets the
// owner reach out without leaving the board.
export function LeadCard({
  lead,
  client,
  settings,
}: {
  lead: Lead;
  client: Client;
  settings: ClientSettings | null;
}) {
  const reviewMessage = buildReviewMessage(client, settings, lead);
  const smsHref = buildSmsHref(lead.phone, reviewMessage);
  const emailHref = buildEmailHref(
    lead.email,
    `Quick favor — review for ${businessName(client, settings)}?`,
    reviewMessage
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/dashboard/leads/${lead.id}`}
          className="font-semibold text-gray-900 hover:text-brand"
        >
          {lead.name}
        </Link>
        <span className="shrink-0 text-xs text-gray-400">{formatDate(lead.created_at)}</span>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        {lead.service_needed && (
          <span className="text-sm font-medium text-brand">{lead.service_needed}</span>
        )}
        {lead.estimate_value != null && (
          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
            {formatMoney(lead.estimate_value)}
          </span>
        )}
      </div>

      <div className="mt-2 space-y-0.5 text-sm text-gray-600">
        {lead.phone && (
          <a href={`tel:${lead.phone}`} className="block hover:text-gray-900">
            {lead.phone}
          </a>
        )}
        {lead.email && (
          <a href={`mailto:${lead.email}`} className="block truncate hover:text-gray-900">
            {lead.email}
          </a>
        )}
      </div>

      {lead.message && (
        <p className="mt-2 line-clamp-2 text-sm text-gray-500">{lead.message}</p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        {lead.source && (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {lead.source}
          </span>
        )}
        <div className="ml-auto">
          <StatusSelect leadId={lead.id} status={lead.status} />
        </div>
      </div>

      {settings?.google_review_link && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <ReviewRequestButton
            message={reviewMessage}
            smsHref={smsHref}
            emailHref={emailHref}
            hasReviewLink
            compact
          />
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
