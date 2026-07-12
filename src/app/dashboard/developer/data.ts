import type { SupabaseClient } from "@supabase/supabase-js";

// =============================================================================
// Developer console data. Admin-only; reads the observability tables with the
// service-role client (across all companies). Each section is capped.
// =============================================================================

const LIMIT = 60;

export interface LogRow {
  id: string;
  company_id: string;
  provider: string | null;
  level: string;
  action: string;
  message: string | null;
  http_status: number | null;
  duration_ms: number | null;
  context: unknown;
  created_at: string;
}

export interface EventRow {
  id: string;
  company_id: string;
  provider: string;
  event_type: string;
  status: string;
  direction: string;
  payload: unknown;
  created_at: string;
}

export interface WorkflowRow {
  id: string;
  company_id: string;
  event_type: string;
  request_id: string | null;
  data: unknown;
  created_at: string;
}

export interface SyncRow {
  id: string;
  company_id: string;
  provider: string | null;
  job_type: string;
  status: string;
  records_processed: number;
  records_failed: number;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  stats: unknown;
  created_at: string;
}

export interface DeveloperConsoleData {
  webhooks: LogRow[];
  apiRequests: LogRow[];
  retries: LogRow[];
  events: EventRow[];
  workflows: WorkflowRow[];
  syncHistory: SyncRow[];
}

export async function getDeveloperConsoleData(admin: SupabaseClient): Promise<DeveloperConsoleData> {
  const logSelect = "id, company_id, provider, level, action, message, http_status, duration_ms, context, created_at";

  const [webhooks, apiRequests, retries, events, workflows, syncHistory] = await Promise.all([
    admin.from("integration_logs").select(logSelect).ilike("action", "webhook%").order("created_at", { ascending: false }).limit(LIMIT).returns<LogRow[]>(),
    admin.from("integration_logs").select(logSelect).or("action.ilike.sync%,action.ilike.token%,action.ilike.api%").order("created_at", { ascending: false }).limit(LIMIT).returns<LogRow[]>(),
    admin.from("integration_logs").select(logSelect).eq("level", "warn").order("created_at", { ascending: false }).limit(LIMIT).returns<LogRow[]>(),
    admin.from("integration_events").select("id, company_id, provider, event_type, status, direction, payload, created_at").order("created_at", { ascending: false }).limit(LIMIT).returns<EventRow[]>(),
    admin.from("review_events").select("id, company_id, event_type, request_id, data, created_at").order("created_at", { ascending: false }).limit(LIMIT).returns<WorkflowRow[]>(),
    admin.from("integration_sync_jobs").select("id, company_id, provider, job_type, status, records_processed, records_failed, started_at, finished_at, error, stats, created_at").order("created_at", { ascending: false }).limit(LIMIT).returns<SyncRow[]>(),
  ]);

  return {
    webhooks: webhooks.data ?? [],
    apiRequests: apiRequests.data ?? [],
    retries: retries.data ?? [],
    events: events.data ?? [],
    workflows: workflows.data ?? [],
    syncHistory: syncHistory.data ?? [],
  };
}
