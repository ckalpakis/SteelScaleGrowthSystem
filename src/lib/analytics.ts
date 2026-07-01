// =============================================================================
// Lead analytics — pure, dependency-free aggregations for the client dashboard.
// Everything the dashboard charts render is derived here from the raw leads so
// the page component stays declarative and the math stays testable.
// =============================================================================

import { PIPELINE_STAGES, type Lead, type LeadStatus } from "@/lib/types";

export const RANGE_OPTIONS = [7, 30, 90] as const;
export type RangeDays = (typeof RANGE_OPTIONS)[number];

// Brand-consistent hex colors per pipeline stage (SVG charts need real colors,
// not Tailwind classes). Mirrors the order in PIPELINE_STAGES.
export const STAGE_COLORS: Record<LeadStatus, string> = {
  new: "#3b82f6",
  contacted: "#f59e0b",
  estimate_scheduled: "#8b5cf6",
  won: "#22c55e",
  lost: "#9ca3af",
};

export interface TimePoint {
  /** ISO date (YYYY-MM-DD) at the start of the bucket. */
  key: string;
  /** Short human label for the axis (e.g. "Jul 3" or "Jul"). */
  label: string;
  leads: number;
  won: number;
}

export interface KpiDelta {
  value: number;
  /** % change vs the previous equal-length period; null when no baseline. */
  changePct: number | null;
}

export interface Analytics {
  rangeDays: RangeDays;
  totalLeads: KpiDelta;
  won: KpiDelta;
  /** Won ÷ total leads in range, as a 0–100 number. */
  conversionRate: number;
  /** Leads currently sitting in "new" (need a first response), all-time. */
  needsResponse: number;
  /** Active pipeline: leads not yet won or lost, all-time. */
  openPipeline: number;
  series: TimePoint[];
  stageDistribution: { status: LeadStatus; label: string; count: number; color: string }[];
  sources: { name: string; count: number }[];
  totalAllTime: number;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null; // null → "new" (no baseline)
  return Math.round(((current - previous) / previous) * 100);
}

// Bucket by day for ≤30-day ranges, by week for longer ranges, so the line
// graph never gets too dense to read.
function buildSeries(leads: Lead[], rangeDays: RangeDays, now: Date): TimePoint[] {
  const byWeek = rangeDays > 30;
  const bucketDays = byWeek ? 7 : 1;
  const buckets = Math.ceil(rangeDays / bucketDays);
  const points: TimePoint[] = [];
  const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

  const anchor = startOfDay(now);
  const index = new Map<string, TimePoint>();
  for (let i = buckets - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - i * bucketDays);
    const p: TimePoint = { key: dateKey(d), label: monthFmt.format(d), leads: 0, won: 0 };
    points.push(p);
    // Map every day in this bucket to the bucket start so lookups are O(1).
    for (let j = 0; j < bucketDays; j++) {
      const dd = new Date(d);
      dd.setDate(d.getDate() + j);
      index.set(dateKey(dd), p);
    }
  }

  for (const lead of leads) {
    const created = startOfDay(new Date(lead.created_at));
    const p = index.get(dateKey(created));
    if (!p) continue;
    p.leads += 1;
    if (lead.status === "won") p.won += 1;
  }
  return points;
}

export function computeAnalytics(leads: Lead[], rangeDays: RangeDays, now: Date = new Date()): Analytics {
  const rangeStart = new Date(startOfDay(now));
  rangeStart.setDate(rangeStart.getDate() - (rangeDays - 1));
  const prevStart = new Date(rangeStart);
  prevStart.setDate(prevStart.getDate() - rangeDays);

  const inRange = leads.filter((l) => new Date(l.created_at) >= rangeStart);
  const inPrev = leads.filter((l) => {
    const t = new Date(l.created_at);
    return t >= prevStart && t < rangeStart;
  });

  const wonInRange = inRange.filter((l) => l.status === "won").length;
  const wonInPrev = inPrev.filter((l) => l.status === "won").length;

  const stageDistribution = PIPELINE_STAGES.map((s) => ({
    status: s.value,
    label: s.label,
    count: leads.filter((l) => l.status === s.value).length,
    color: STAGE_COLORS[s.value],
  }));

  const sourceCounts = new Map<string, number>();
  for (const l of leads) {
    const name = prettySource(l.source);
    sourceCounts.set(name, (sourceCounts.get(name) ?? 0) + 1);
  }
  const sources = [...sourceCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    rangeDays,
    totalLeads: { value: inRange.length, changePct: pctChange(inRange.length, inPrev.length) },
    won: { value: wonInRange, changePct: pctChange(wonInRange, wonInPrev) },
    conversionRate: inRange.length ? Math.round((wonInRange / inRange.length) * 100) : 0,
    needsResponse: leads.filter((l) => l.status === "new").length,
    openPipeline: leads.filter((l) => l.status === "new" || l.status === "contacted" || l.status === "estimate_scheduled").length,
    series: buildSeries(leads, rangeDays, now),
    stageDistribution,
    sources,
    totalAllTime: leads.length,
  };
}

function prettySource(source: string | null): string {
  if (!source) return "Direct";
  return source
    .replace(/[-_]/g, " ")
    .replace(/\bwebsite\b/i, "Website")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
