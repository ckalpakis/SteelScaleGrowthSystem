import Link from "next/link";
import { StatusSelect } from "./StatusSelect";
import type { Lead } from "@/lib/types";

// A single lead card. Used on the grouped board and the overview. Shows the
// key contact info at a glance; the status dropdown updates inline; clicking
// the name opens the detail page.
export function LeadCard({ lead }: { lead: Lead }) {
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

      {lead.service_needed && (
        <p className="mt-1 text-sm font-medium text-brand">{lead.service_needed}</p>
      )}

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
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
