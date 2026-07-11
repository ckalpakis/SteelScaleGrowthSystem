import { createClient } from "@/lib/supabase/server";
import { PageHeader, StatCard, Panel, StatusPill, EmptyState, SendIcon, ChartIcon } from "@/components/dashboard/reputation/ui";
import { BarChart } from "@/components/dashboard/reputation/charts";
import { CopyLinkButton } from "@/components/dashboard/reputation/review-requests/CopyLinkButton";
import { getReviewLinkAnalytics, type RequestRow } from "@/lib/reputation.analytics";
import { reviewLinkUrl } from "@/lib/reputation";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "green" | "blue" | "amber" | "gray" | "red"> = {
  completed: "green",
  clicked: "blue",
  opened: "blue",
  delivered: "green",
  sent: "amber",
  scheduled: "amber",
  pending: "gray",
  failed: "red",
  opted_out: "red",
};

const DATE_FMT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function fmt(iso: string | null): string {
  return iso ? DATE_FMT.format(new Date(iso)) : "—";
}

export default async function ReviewRequestsPage() {
  const supabase = createClient();
  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle<{ id: string }>();

  const analytics = company
    ? await getReviewLinkAnalytics(supabase, company.id)
    : { sent: 0, totalClicks: 0, clickedRequests: 0, reviews: 0, clickThroughRate: 0, clicksPerWeek: [], recent: [] as RequestRow[] };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Requests"
        description="Send and track requests that turn happy customers into reviews."
      />

      {/* Click analytics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Requests Sent" value={String(analytics.sent)} icon={<SendIcon className="h-4 w-4" />} />
        <StatCard label="Link Clicks" value={String(analytics.totalClicks)} icon={<ChartIcon className="h-4 w-4" />} trend={`${analytics.clickedRequests} unique`} />
        <StatCard
          label="Click-Through Rate"
          value={`${analytics.clickThroughRate}%`}
          icon={<ChartIcon className="h-4 w-4" />}
          trend="Sent → clicked"
          trendUp={analytics.clickThroughRate > 0}
        />
        <StatCard label="Reviews" value={String(analytics.reviews)} icon={<SendIcon className="h-4 w-4" />} trend="Completed" trendUp={analytics.reviews > 0} />
      </div>

      <Panel title="Clicks Per Week">
        <BarChart data={analytics.clicksPerWeek} />
      </Panel>

      {/* Requests table */}
      {analytics.recent.length === 0 ? (
        <EmptyState
          icon={<SendIcon className="h-5 w-5" />}
          title="No review requests yet"
          description="Send a review request from the Contacts page to start tracking clicks and conversions."
        />
      ) : (
        <Panel className="overflow-hidden !p-0" title="Recent Requests">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#f0f0ef] bg-[#fafafa] text-left text-xs uppercase tracking-wide text-[#9b9a97]">
                <tr>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">Sent</th>
                  <th className="px-5 py-3 font-medium">Clicks</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0ef]">
                {analytics.recent.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-[#fafafa]">
                    <td className="px-5 py-3 font-medium text-[#37352f]">{r.contactName}</td>
                    <td className="hidden px-5 py-3 text-[#787774] sm:table-cell">{fmt(r.sentAt ?? r.createdAt)}</td>
                    <td className="px-5 py-3 text-[#787774]">{r.clicks}</td>
                    <td className="px-5 py-3">
                      <StatusPill tone={STATUS_TONE[r.status] ?? "gray"}>{r.status}</StatusPill>
                    </td>
                    <td className="px-5 py-3">
                      {r.shortCode ? <CopyLinkButton url={reviewLinkUrl(r.shortCode)} /> : <span className="text-xs text-[#b9b9b7]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
