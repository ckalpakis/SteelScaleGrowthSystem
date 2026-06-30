import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LeadCard } from "@/components/dashboard/LeadCard";
import { NotLinked } from "@/components/dashboard/NotLinked";
import { PIPELINE_STAGES, type Lead } from "@/lib/types";

// Overview — at-a-glance pipeline counts and the most recent leads.
export default async function DashboardPage() {
  const { client, settings } = await requireClient();
  if (!client) return <NotLinked />;

  const supabase = createClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false })
    .returns<Lead[]>();

  const rows = leads ?? [];
  const counts = countByStatus(rows);
  const recent = rows.slice(0, 6);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-sm text-gray-500">Here&apos;s how your leads are doing.</p>
        </div>
        {!settings?.google_review_link && (
          <Link
            href="/dashboard/settings"
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
          >
            Finish setup in Settings →
          </Link>
        )}
      </div>

      {/* Pipeline summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PIPELINE_STAGES.map((stage) => (
          <Link
            key={stage.value}
            href="/dashboard/leads"
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${stage.dotClass}`} />
              <span className="text-xs font-medium text-gray-500">{stage.label}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {counts[stage.value] ?? 0}
            </p>
          </Link>
        ))}
      </div>

      {/* Recent leads */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent leads</h2>
          <Link href="/dashboard/leads" className="text-sm font-medium text-brand hover:underline">
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            No leads yet. Share your{" "}
            <Link href={`/site/${client.slug}`} target="_blank" className="font-medium text-brand underline">
              website
            </Link>{" "}
            to start capturing them.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((lead) => (
              <LeadCard key={lead.id} lead={lead} client={client} settings={settings} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function countByStatus(rows: Lead[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
  return counts;
}
