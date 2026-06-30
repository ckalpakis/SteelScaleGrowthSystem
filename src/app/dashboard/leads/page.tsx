import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LeadCard } from "@/components/dashboard/LeadCard";
import { PIPELINE_STAGES, type Lead } from "@/lib/types";
import { NotLinked } from "@/components/dashboard/NotLinked";

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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500">{rows.length} total</p>
        </div>
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
