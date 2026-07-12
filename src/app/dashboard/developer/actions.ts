"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAgencyAdmin } from "@/lib/auth";
import { publishEvent, isPlatformEventType, type EventPayloadMap, type PlatformEventType, type EventProvider } from "@/lib/events";
import { startEventListeners } from "@/lib/events/listener.server";

const PATH = "/dashboard/developer";

export type ReplayResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Replay a stored integration event through the platform event bus. Rebuilds a
 * standardized PlatformEvent from the stored row and re-publishes it, so the
 * listener + workflow engine run again (useful for debugging automations).
 */
export async function replayEvent(eventId: string): Promise<ReplayResult> {
  await requireAgencyAdmin();

  const admin = createAdminClient();
  const { data: event } = await admin
    .from("integration_events")
    .select("company_id, provider, event_type, payload")
    .eq("id", eventId)
    .maybeSingle<{ company_id: string; provider: string | null; event_type: string; payload: unknown }>();

  if (!event) return { ok: false, error: "Event not found." };
  if (!isPlatformEventType(event.event_type)) {
    return { ok: false, error: `"${event.event_type}" is not a standardized platform event; nothing to replay.` };
  }

  // Attach the listener to the in-process bus, then re-publish.
  startEventListeners();
  const result = await publishEvent(event.event_type as PlatformEventType, {
    companyId: event.company_id,
    provider: (event.provider ?? "internal") as EventProvider,
    source: "api",
    payload: (event.payload ?? {}) as EventPayloadMap[PlatformEventType],
  });

  await admin.from("integration_logs").insert({
    company_id: event.company_id,
    provider: event.provider,
    level: "info",
    action: "debug.replay_event",
    message: `Replayed ${event.event_type}`,
    context: { eventId, handled: result.handled, errors: result.errors.length },
  });

  revalidatePath(PATH);
  return { ok: true, message: `Replayed ${event.event_type} → ${result.handled} handler(s), ${result.errors.length} error(s).` };
}

/** Re-enqueue a sync job for debugging. */
export async function replaySyncJob(jobId: string): Promise<ReplayResult> {
  await requireAgencyAdmin();

  const admin = createAdminClient();
  const { data: job } = await admin
    .from("integration_sync_jobs")
    .select("company_id, provider, job_type")
    .eq("id", jobId)
    .maybeSingle<{ company_id: string; provider: string | null; job_type: string }>();
  if (!job) return { ok: false, error: "Sync job not found." };

  const { error } = await admin.from("integration_sync_jobs").insert({
    company_id: job.company_id,
    provider: job.provider,
    job_type: job.job_type,
    status: "queued",
    scheduled_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(PATH);
  return { ok: true, message: `Re-queued ${job.job_type}.` };
}
