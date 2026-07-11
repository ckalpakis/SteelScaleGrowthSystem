import { Button } from "@/components/ui";
import {
  PageHeader,
  StatCard,
  Panel,
  Stars,
  StatusPill,
  StarIcon,
  UsersIcon,
  SendIcon,
  ChartIcon,
} from "@/components/dashboard/reputation/ui";

// Placeholder sample data — no business logic yet.
const PLATFORMS = [
  { name: "Google", rating: 4.9, reviews: 168 },
  { name: "Facebook", rating: 4.7, reviews: 41 },
  { name: "Yelp", rating: 4.5, reviews: 12 },
];

const RECENT = [
  { name: "Karen M.", platform: "Google", rating: 5, text: "Fast, professional, and spotless cleanup. Highly recommend!" },
  { name: "Dave R.", platform: "Google", rating: 5, text: "They found the real cause of our leak when two others missed it." },
  { name: "Priya S.", platform: "Facebook", rating: 4, text: "Great communication throughout. The crew was respectful." },
];

export default function ReputationOverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Track your ratings, reviews, and requests at a glance."
        action={<Button>Send a review request</Button>}
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Average Rating" value="4.8" icon={<StarIcon className="h-4 w-4" />} trend="+0.2 this month" trendUp />
        <StatCard label="Total Reviews" value="221" icon={<UsersIcon className="h-4 w-4" />} trend="+18 this month" trendUp />
        <StatCard label="Requests Sent" value="96" icon={<SendIcon className="h-4 w-4" />} trend="34% response rate" />
        <StatCard label="Reputation Score" value="92" icon={<ChartIcon className="h-4 w-4" />} trend="Excellent" trendUp />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Rating trend placeholder */}
        <Panel title="Rating Trend" className="lg:col-span-2">
          <div className="flex h-56 items-end gap-2">
            {[60, 72, 68, 80, 76, 88, 84, 92, 90, 96, 94, 98].map((h, i) => (
              <div key={i} className="flex-1 rounded-t-md bg-brand/15" style={{ height: `${h}%` }} />
            ))}
          </div>
          <p className="mt-3 text-xs text-[#9b9a97]">Sample data — connect your review platforms to see live trends.</p>
        </Panel>

        {/* Reviews by platform */}
        <Panel title="Reviews by Platform">
          <ul className="space-y-4">
            {PLATFORMS.map((p) => (
              <li key={p.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[#37352f]">{p.name}</span>
                  <span className="text-[#787774]">{p.reviews} reviews</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <Stars value={Math.round(p.rating)} />
                  <span className="text-xs font-semibold text-[#37352f]">{p.rating.toFixed(1)}</span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Recent reviews */}
      <Panel title="Recent Reviews" action={<Button variant="ghost" className="text-xs">View all</Button>}>
        <ul className="divide-y divide-[#f0f0ef]">
          {RECENT.map((r, i) => (
            <li key={i} className="flex gap-3 py-4 first:pt-0 last:pb-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 font-semibold text-brand">
                {r.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[#37352f]">{r.name}</span>
                  <Stars value={r.rating} />
                  <StatusPill tone="gray">{r.platform}</StatusPill>
                </div>
                <p className="mt-1 text-sm text-[#787774]">{r.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
