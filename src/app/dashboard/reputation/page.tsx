import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import {
  PageHeader,
  RatingCard,
  StatCard,
  Panel,
  StarIcon,
  UsersIcon,
  SendIcon,
  ChartIcon,
} from "@/components/dashboard/reputation/ui";
import { AreaChart, BarChart, type ChartPoint } from "@/components/dashboard/reputation/charts";
import { ActivityFeed, type Activity } from "@/components/dashboard/reputation/ActivityFeed";

export const dynamic = "force-dynamic";

// Placeholder data (no business logic yet).
const REVIEW_GROWTH: ChartPoint[] = [
  { label: "Dec", value: 172 },
  { label: "Jan", value: 178 },
  { label: "Feb", value: 185 },
  { label: "Mar", value: 191 },
  { label: "Apr", value: 199 },
  { label: "May", value: 207 },
  { label: "Jun", value: 214 },
  { label: "Jul", value: 221 },
];

const REQUESTS_PER_MONTH: ChartPoint[] = [
  { label: "Dec", value: 8 },
  { label: "Jan", value: 11 },
  { label: "Feb", value: 9 },
  { label: "Mar", value: 14 },
  { label: "Apr", value: 12 },
  { label: "May", value: 16 },
  { label: "Jun", value: 13 },
  { label: "Jul", value: 18 },
];

const ACTIVITY: Activity[] = [
  { type: "request_sent", title: "Review request sent", description: "SMS to Karen Mitchell", time: "2m ago" },
  { type: "clicked", title: "Customer clicked", description: "Dave Robertson opened the review link", time: "18m ago" },
  { type: "review_received", title: "New review received", description: "★★★★★ from Priya Shah on Google", time: "1h ago" },
  { type: "sms_failed", title: "SMS failed", description: "Undelivered to (412) 555-0176 — invalid number", time: "3h ago" },
  { type: "workflow_started", title: "Workflow started", description: "“Request review when job marked Won” triggered", time: "5h ago" },
];

export default async function ReputationOverviewPage() {
  // Real Google rating when connected; falls back to placeholders otherwise.
  const supabase = createClient();
  const { data: gp } = await supabase
    .from("google_business_profiles")
    .select("average_rating, total_reviews")
    .limit(1)
    .maybeSingle<{ average_rating: number | null; total_reviews: number }>();
  const rating = gp?.average_rating ?? 4.9;
  const totalReviews = gp?.total_reviews ?? 168;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Track your ratings, reviews, and requests at a glance."
        action={<Button>Send a review request</Button>}
      />

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RatingCard rating={rating} reviews={totalReviews} platform="Google" />
        <StatCard label="Total Reviews" value={String(totalReviews)} icon={<UsersIcon className="h-4 w-4" />} trend="+18 this month" trendUp />
        <StatCard label="Reviews This Month" value="18" icon={<StarIcon className="h-4 w-4" />} trend="+6 vs last month" trendUp />
        <StatCard label="Review Requests Sent" value="96" icon={<SendIcon className="h-4 w-4" />} trend="+18 this month" trendUp />
        <StatCard label="Pending Requests" value="12" icon={<SendIcon className="h-4 w-4" />} trend="Awaiting a response" />
        <StatCard label="Conversion Rate" value="34%" icon={<ChartIcon className="h-4 w-4" />} trend="Requests → reviews" trendUp />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Review Growth">
          <AreaChart data={REVIEW_GROWTH} gradientId="reviewGrowth" />
        </Panel>
        <Panel title="Requests Sent Per Month">
          <BarChart data={REQUESTS_PER_MONTH} />
        </Panel>
      </div>

      {/* Recent activity */}
      <Panel title="Recent Activity" action={<Button variant="ghost" className="text-xs">View all</Button>}>
        <ActivityFeed items={ACTIVITY} />
      </Panel>
    </div>
  );
}
