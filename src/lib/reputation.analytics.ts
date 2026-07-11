import type { SupabaseClient } from "@supabase/supabase-js";

// =============================================================================
// Review-link click analytics. Computed from review_requests + review_clicks.
// Takes a Supabase client so it works with either the RLS session client
// (dashboard) or the service-role client.
// =============================================================================

export interface ChartPoint {
  label: string;
  value: number;
}

export interface RequestRow {
  id: string;
  contactName: string;
  status: string;
  shortCode: string | null;
  clickedAt: string | null;
  sentAt: string | null;
  createdAt: string;
  clicks: number;
}

export interface ReviewLinkAnalytics {
  sent: number;
  totalClicks: number;
  clickedRequests: number;
  reviews: number;
  clickThroughRate: number; // percent, 0–100
  clicksPerWeek: ChartPoint[];
  recent: RequestRow[];
}

const WEEKS = 8;
const MONTH_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay()); // back to Sunday
  return x;
}

export async function getReviewLinkAnalytics(
  supabase: SupabaseClient,
  companyId: string
): Promise<ReviewLinkAnalytics> {
  // Requests with the contact name joined in.
  const { data: reqData } = await supabase
    .from("review_requests")
    .select("id, status, short_code, clicked_at, sent_at, created_at, contact:review_contacts(name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .returns<
      {
        id: string;
        status: string;
        short_code: string | null;
        clicked_at: string | null;
        sent_at: string | null;
        created_at: string;
        contact: { name: string } | { name: string }[] | null;
      }[]
    >();
  const requests = reqData ?? [];

  // Click events (last 8 weeks for the chart; all for per-request counts).
  const since = startOfWeek(new Date());
  since.setDate(since.getDate() - 7 * (WEEKS - 1));
  const { data: clickData } = await supabase
    .from("review_clicks")
    .select("request_id, clicked_at")
    .eq("company_id", companyId)
    .returns<{ request_id: string; clicked_at: string }[]>();
  const clicks = clickData ?? [];

  // Per-request click counts.
  const clicksByRequest = new Map<string, number>();
  for (const c of clicks) clicksByRequest.set(c.request_id, (clicksByRequest.get(c.request_id) ?? 0) + 1);

  const sent = requests.filter((r) => r.status !== "pending").length;
  const clickedRequests = requests.filter((r) => r.clicked_at).length;
  const reviews = requests.filter((r) => r.status === "completed").length;
  const clickThroughRate = sent > 0 ? Math.round((clickedRequests / sent) * 100) : 0;

  // Weekly click buckets.
  const weekBuckets: { start: number; label: string; value: number }[] = [];
  for (let i = 0; i < WEEKS; i++) {
    const start = new Date(since);
    start.setDate(start.getDate() + i * 7);
    weekBuckets.push({ start: start.getTime(), label: MONTH_DAY.format(start), value: 0 });
  }
  for (const c of clicks) {
    const t = new Date(c.clicked_at).getTime();
    for (let i = weekBuckets.length - 1; i >= 0; i--) {
      if (t >= weekBuckets[i].start) {
        weekBuckets[i].value++;
        break;
      }
    }
  }

  const contactName = (c: { name: string } | { name: string }[] | null): string => {
    if (!c) return "Unknown contact";
    return Array.isArray(c) ? c[0]?.name ?? "Unknown contact" : c.name;
  };

  const recent: RequestRow[] = requests.slice(0, 10).map((r) => ({
    id: r.id,
    contactName: contactName(r.contact),
    status: r.status,
    shortCode: r.short_code,
    clickedAt: r.clicked_at,
    sentAt: r.sent_at,
    createdAt: r.created_at,
    clicks: clicksByRequest.get(r.id) ?? 0,
  }));

  return {
    sent,
    totalClicks: clicks.length,
    clickedRequests,
    reviews,
    clickThroughRate,
    clicksPerWeek: weekBuckets.map(({ label, value }) => ({ label, value })),
    recent,
  };
}
