"use client";

import { useTransition } from "react";
import { PIPELINE_STAGES, type LeadStatus } from "@/lib/types";
import { updateLeadStatus } from "@/app/dashboard/actions";

// Inline status dropdown. Persists immediately via the server action.
export function StatusSelect({
  leadId,
  status,
}: {
  leadId: string;
  status: LeadStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as LeadStatus;
        startTransition(() => updateLeadStatus(leadId, next));
      }}
      className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-60"
      onClick={(e) => e.stopPropagation()}
    >
      {PIPELINE_STAGES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
