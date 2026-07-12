import type { SupabaseClient } from "@supabase/supabase-js";
import { integrationDef, type IntegrationStatus } from "@/lib/integrations";

// =============================================================================
// Integration dashboard data. Reads the operational tables (sync jobs, events)
// with the RLS session client, and integration_webhooks with the service-role
// client (that table is service-role only). Aggregation is done in JS.
// =============================================================================

export interface DashboardCard {
  provider: string;
  name: string;
  color: string;
  monogram: string;
  status: IntegrationStatus;
  connectedAccount: string | null;
  lastSyncAt: string | null;
  customersSynced: number;
  jobsSynced: number;
  errors: number;
  webhookStatus: "active" | "error" | "none";
  apiStatus: "operational" | "error" | "disconnected";
  activeJob: { jobType: string; status: string } | null;
}

export interface RecentEvent {
  id: string;
  provider: string;
  eventType: string;
  status: string;
  at: string;
}

export interface IntegrationDashboardData {
  cards: DashboardCard[];
  recentEvents: RecentEvent[];
}

type ConnRow = { provider: string; status: string; connected_account: string | null; last_sync_at: string | null };
type JobRow = { provider: string | null; job_type: string; status: string; records_processed: number; records_failed: number; finished_at: string | null };
type EventRow = { id: string; provider: string; event_type: string; status: string; created_at: string };
type WebhookRow = { provider: string | null; status: string };

export async function getIntegrationDashboard(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  companyId: string
): Promise<IntegrationDashboardData> {
  const [{ data: conns }, { data: jobs }, { data: events }, { data: webhooks }] = await Promise.all([
    supabase
      .from("integration_connections")
      .select("provider, status, connected_account, last_sync_at")
      .eq("company_id", companyId)
      .returns<ConnRow[]>(),
    supabase
      .from("integration_sync_jobs")
      .select("provider, job_type, status, records_processed, records_failed, finished_at")
      .eq("company_id", companyId)
      .returns<JobRow[]>(),
    supabase
      .from("integration_events")
      .select("id, provider, event_type, status, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(12)
      .returns<EventRow[]>(),
    admin.from("integration_webhooks").select("provider, status").eq("company_id", companyId).returns<WebhookRow[]>(),
  ]);

  const jobsByProvider = groupBy(jobs ?? [], (j) => j.provider ?? "");
  const webhooksByProvider = groupBy(webhooks ?? [], (w) => w.provider ?? "");
  const failedEventsByProvider = new Map<string, number>();
  for (const e of events ?? []) {
    if (e.status === "failed") failedEventsByProvider.set(e.provider, (failedEventsByProvider.get(e.provider) ?? 0) + 1);
  }

  const cards: DashboardCard[] = (conns ?? [])
    .filter((c) => c.status === "connected")
    .map((c) => {
      const def = integrationDef(c.provider);
      const providerJobs = jobsByProvider.get(c.provider) ?? [];
      const providerWebhooks = webhooksByProvider.get(c.provider) ?? [];

      const customersSynced = sum(providerJobs.filter((j) => j.job_type.includes("customer")), (j) => j.records_processed);
      const jobsSynced = sum(providerJobs.filter((j) => j.job_type.includes("job")), (j) => j.records_processed);
      const syncErrors = sum(providerJobs, (j) => j.records_failed) + providerJobs.filter((j) => j.status === "failed").length;
      const errors = syncErrors + (failedEventsByProvider.get(c.provider) ?? 0);

      const lastFinished = providerJobs
        .map((j) => j.finished_at)
        .filter((d): d is string => !!d)
        .sort()
        .pop();
      const activeJob = providerJobs.find((j) => j.status === "queued" || j.status === "running") ?? null;

      const webhookStatus: DashboardCard["webhookStatus"] = providerWebhooks.some((w) => w.status === "active")
        ? "active"
        : providerWebhooks.some((w) => w.status === "failed")
          ? "error"
          : "none";

      return {
        provider: c.provider,
        name: def?.name ?? c.provider,
        color: def?.color ?? "#6366F1",
        monogram: def?.monogram ?? "?",
        status: c.status as IntegrationStatus,
        connectedAccount: c.connected_account,
        lastSyncAt: lastFinished ?? c.last_sync_at,
        customersSynced,
        jobsSynced,
        errors,
        webhookStatus,
        apiStatus: c.status === "connected" ? "operational" : c.status === "error" ? "error" : "disconnected",
        activeJob: activeJob ? { jobType: activeJob.job_type, status: activeJob.status } : null,
      };
    });

  const recentEvents: RecentEvent[] = (events ?? []).map((e) => ({
    id: e.id,
    provider: e.provider,
    eventType: e.event_type,
    status: e.status,
    at: e.created_at,
  }));

  return { cards, recentEvents };
}

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const arr = map.get(k) ?? [];
    arr.push(r);
    map.set(k, arr);
  }
  return map;
}

function sum<T>(rows: T[], val: (r: T) => number): number {
  return rows.reduce((acc, r) => acc + (val(r) || 0), 0);
}
