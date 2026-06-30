import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card } from "@/components/ui";
import { StatusSelect } from "@/components/dashboard/StatusSelect";
import { PIPELINE_STAGES, stageFor, type Lead } from "@/lib/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const { client } = await requireClient();

  if (!client) {
    return (
      <Card>
        <div className="p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900">Account not linked yet</h2>
          <p className="mt-2 text-sm text-gray-600">
            Your login isn&apos;t connected to a business account. Add a row to
            <code className="mx-1 rounded bg-gray-100 px-1">profiles</code>
            linking your user to a client to get started.
          </p>
        </div>
      </Card>
    );
  }

  const supabase = createClient();
  let query = supabase
    .from("leads")
    .select("*")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  const activeStatus = searchParams.status;
  if (activeStatus && PIPELINE_STAGES.some((s) => s.value === activeStatus)) {
    query = query.eq("status", activeStatus);
  }

  const { data: leads } = await query.returns<Lead[]>();
  const rows = leads ?? [];

  // Counts per stage for the filter chips.
  const { data: allLeads } = await supabase
    .from("leads")
    .select("status")
    .eq("client_id", client.id)
    .returns<{ status: string }[]>();
  const counts = countByStatus(allLeads ?? []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500">{counts.total} total</p>
        </div>
      </div>

      {/* Pipeline filter chips */}
      <div className="mb-5 flex flex-wrap gap-2">
        <FilterChip label="All" count={counts.total} href="/dashboard" active={!activeStatus} />
        {PIPELINE_STAGES.map((s) => (
          <FilterChip
            key={s.value}
            label={s.label}
            count={counts.byStatus[s.value] ?? 0}
            href={`/dashboard?status=${s.value}`}
            active={activeStatus === s.value}
          />
        ))}
      </div>

      {rows.length === 0 ? (
        <Card>
          <div className="p-10 text-center text-sm text-gray-500">
            No leads yet. Share your{" "}
            <Link href={`/site/${client.slug}`} target="_blank" className="font-medium text-brand underline">
              website
            </Link>{" "}
            to start capturing them.
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">Service</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">Received</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((lead) => {
                const stage = stageFor(lead.status);
                return (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className="font-medium text-gray-900 hover:text-brand"
                      >
                        {lead.name}
                      </Link>
                      <div className="mt-0.5 sm:hidden">
                        <Badge className={stage.badgeClass}>{stage.label}</Badge>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      <div>{lead.phone}</div>
                      <div className="text-gray-400">{lead.email}</div>
                    </td>
                    <td className="hidden px-5 py-3 text-gray-600 md:table-cell">
                      {lead.service ?? "—"}
                    </td>
                    <td className="hidden px-5 py-3 text-gray-500 sm:table-cell">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusSelect leadId={lead.id} status={lead.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function FilterChip({
  label,
  count,
  href,
  active,
}: {
  label: string;
  count: number;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${
        active
          ? "border-brand bg-brand text-white"
          : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {label}
      <span className={active ? "text-white/80" : "text-gray-400"}>{count}</span>
    </Link>
  );
}

function countByStatus(rows: { status: string }[]) {
  const byStatus: Record<string, number> = {};
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  return { total: rows.length, byStatus };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
