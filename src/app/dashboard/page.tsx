import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient, isAgencyAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LeadCard } from "@/components/dashboard/LeadCard";
import { NotLinked } from "@/components/dashboard/NotLinked";
import { LeadsLineChart, StageDonut, SourceBars } from "@/components/dashboard/Charts";
import { computeAnalytics, formatMoney, RANGE_OPTIONS, type RangeDays } from "@/lib/analytics";
import { type Lead } from "@/lib/types";

// Overview — GoHighLevel-style analytics: KPI cards, a leads-over-time line
// graph, pipeline distribution, lead sources, and the most recent leads.
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const { email, client, settings } = await requireClient();
  if (!client) {
    if (isAgencyAdmin(email)) redirect("/dashboard/clients");
    return <NotLinked />;
  }

  const range = parseRange(searchParams.range);

  const supabase = createClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false })
    .returns<Lead[]>();

  const rows = leads ?? [];
  const a = computeAnalytics(rows, range);
  const recent = rows.slice(0, 6);
  const rangeLabel = range === 7 ? "7 days" : range === 90 ? "90 days" : "30 days";

  return (
    <div className="space-y-6">
      {/* Header + range selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Your lead performance over the last {rangeLabel}.</p>
        </div>
        <div className="flex items-center gap-3">
          {!settings?.google_review_link && (
            <Link
              href="/dashboard/settings"
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
            >
              Finish setup →
            </Link>
          )}
          <RangeSelector active={range} />
        </div>
      </div>

      {/* Needs-response banner */}
      {a.needsResponse > 0 && (
        <Link
          href="/dashboard/leads"
          className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 transition hover:bg-amber-100"
        >
          <span className="font-medium">
            {a.needsResponse} new lead{a.needsResponse === 1 ? "" : "s"} awaiting your reply — respond fast to win more jobs.
          </span>
          <span className="shrink-0 font-semibold">View →</span>
        </Link>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={`Total Leads · ${rangeLabel}`} value={a.totalLeads.value} changePct={a.totalLeads.changePct} />
        <Kpi
          label={`Won Revenue · ${rangeLabel}`}
          value={formatMoney(a.wonRevenue.value)}
          changePct={a.wonRevenue.changePct}
          positiveIsGood
          sub={`${a.won.value} job${a.won.value === 1 ? "" : "s"} won`}
        />
        <Kpi
          label="Pipeline Value"
          value={formatMoney(a.pipelineValue)}
          sub={`${a.openPipeline} open lead${a.openPipeline === 1 ? "" : "s"}`}
        />
        <Kpi label="Conversion Rate" value={`${a.conversionRate}%`} sub={`${a.won.value} won of ${a.totalLeads.value}`} />
      </div>

      {/* Line graph + pipeline donut */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Leads Over Time" className="lg:col-span-2">
          <LeadsLineChart series={a.series} />
        </Panel>
        <Panel title="Pipeline Distribution">
          <StageDonut data={a.stageDistribution} total={a.totalAllTime} />
        </Panel>
      </div>

      {/* Sources + recent leads */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Lead Sources">
          <SourceBars data={a.sources} />
        </Panel>
        <Panel
          title="Recent Leads"
          className="lg:col-span-2"
          action={
            <Link href="/dashboard/leads" className="text-sm font-medium text-brand hover:underline">
              View all
            </Link>
          }
        >
          {recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
              No leads yet. Share your{" "}
              <Link href={`/site/${client.slug}`} target="_blank" className="font-medium text-brand underline">
                website
              </Link>{" "}
              to start capturing them.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {recent.map((lead) => (
                <LeadCard key={lead.id} lead={lead} client={client} settings={settings} />
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function parseRange(raw: string | undefined): RangeDays {
  const n = Number(raw);
  return (RANGE_OPTIONS as readonly number[]).includes(n) ? (n as RangeDays) : 30;
}

function RangeSelector({ active }: { active: RangeDays }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
      {RANGE_OPTIONS.map((r) => (
        <Link
          key={r}
          href={`/dashboard?range=${r}`}
          scroll={false}
          className={
            "rounded-md px-3 py-1.5 text-sm font-medium transition " +
            (r === active ? "bg-brand text-white shadow-sm" : "text-gray-600 hover:bg-gray-100")
          }
        >
          {r}d
        </Link>
      ))}
    </div>
  );
}

function Kpi({
  label,
  value,
  changePct,
  sub,
  alert,
  positiveIsGood,
}: {
  label: string;
  value: string | number;
  changePct?: number | null;
  sub?: string;
  alert?: boolean;
  positiveIsGood?: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl border bg-white p-5 shadow-sm " + (alert ? "border-amber-300 bg-amber-50/60" : "border-gray-200")
      }
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {changePct !== undefined && <Delta changePct={changePct} positiveIsGood={positiveIsGood} />}
      </div>
      {sub && <p className={"mt-1 text-xs " + (alert ? "text-amber-700" : "text-gray-400")}>{sub}</p>}
    </div>
  );
}

function Delta({ changePct, positiveIsGood = true }: { changePct: number | null; positiveIsGood?: boolean }) {
  if (changePct === null) {
    return <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">New</span>;
  }
  if (changePct === 0) {
    return <span className="text-xs font-semibold text-gray-400">—</span>;
  }
  const up = changePct > 0;
  const good = up === positiveIsGood;
  return (
    <span
      className={
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold " +
        (good ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")
      }
    >
      {up ? "↑" : "↓"} {Math.abs(changePct)}%
    </span>
  );
}

function Panel({
  title,
  children,
  className,
  action,
  legend,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  legend?: React.ReactNode;
}) {
  return (
    <section className={"rounded-xl border border-gray-200 bg-white p-5 shadow-sm " + (className ?? "")}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {legend ?? action}
      </div>
      {children}
    </section>
  );
}
