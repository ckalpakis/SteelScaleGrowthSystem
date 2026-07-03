import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LeadCard } from "@/components/dashboard/LeadCard";
import { PIPELINE_STAGES, hasReviewAutomation, type Lead } from "@/lib/types";
import { NotLinked } from "@/components/dashboard/NotLinked";
import { ReviewBlastButton } from "@/components/dashboard/ReviewBlastButton";

// Leads board — cards grouped into a column per pipeline stage.
export default async function LeadsPage() {
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
  const byStage = groupByStatus(rows);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#37352f]">Leads</h1>
          <p className="mt-1 text-sm text-[#787774]">{rows.length} total</p>
        </div>
        {rows.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            {hasReviewAutomation(client) && <ReviewBlastButton />}
            <a
              href="/dashboard/leads/export"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3v12m0 0 4-4m-4 4-4-4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
              </svg>
              Export CSV
            </a>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          No leads yet. Share your{" "}
          <Link href={`/site/${client.slug}`} target="_blank" className="font-medium text-brand underline">
            website
          </Link>{" "}
          to start capturing them.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = byStage[stage.value] ?? [];
            return (
              <div key={stage.value} className="flex flex-col">
                <div className="mb-3 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${stage.dotClass}`} />
                  <h2 className="text-sm font-semibold text-gray-700">{stage.label}</h2>
                  <span className="text-xs text-gray-400">{stageLeads.length}</span>
                </div>
                <div className="space-y-3">
                  {stageLeads.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-gray-200 px-3 py-6 text-center text-xs text-gray-400">
                      Nothing here yet
                    </p>
                  ) : (
                    stageLeads.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} client={client} settings={settings} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function groupByStatus(leads: Lead[]): Record<string, Lead[]> {
  const map: Record<string, Lead[]> = {};
  for (const lead of leads) {
    (map[lead.status] ??= []).push(lead);
  }
  return map;
}
