// =============================================================================
// Onboarding provisioning — drain helper. Server-only.
//
// Claims and processes queued provisioning runs one at a time until none remain
// or the time/count budget is spent. Shared by the standalone provisioning
// endpoint and (best-effort) the existing daily cron, so no extra Vercel cron
// slot is required.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

import { createProvisioningEngine } from "@/lib/onboarding/provisioning/factory.server";

export interface DrainOptions {
  workerId?: string;
  maxRuns?: number;
  deadlineMs?: number;
}

export interface DrainResult {
  processed: number;
  results: { runId: string; result: string }[];
}

/** Drain queued provisioning runs within a bounded budget. */
export async function drainProvisioning(admin: SupabaseClient, opts: DrainOptions = {}): Promise<DrainResult> {
  const engine = createProvisioningEngine(admin, { workerId: opts.workerId ?? "cron" });
  const maxRuns = opts.maxRuns ?? 25;
  const deadline = Date.now() + (opts.deadlineMs ?? 50_000);

  const results: { runId: string; result: string }[] = [];
  while (results.length < maxRuns && Date.now() < deadline) {
    const next = await engine.provisionNext();
    if (!next) break;
    results.push({ runId: next.runId, result: next.outcome.result });
  }
  return { processed: results.length, results };
}
