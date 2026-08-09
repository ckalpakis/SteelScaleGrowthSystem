import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processDueRequests } from "@/lib/reputation.engine";
import { drainProvisioning } from "@/lib/onboarding/provisioning/drain.server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Scheduled background job (see vercel.json). Advances every review-request
// workflow run that is due: sends the initial SMS after the configured delay,
// then reminders on their cadence, honoring stop conditions and max reminders.
// Protected by CRON_SECRET — Vercel Cron sends it as a Bearer token.
//
// It ALSO drains any queued onboarding provisioning runs (best-effort). This
// piggybacks on an existing cron slot so provisioning advances automatically
// without needing a dedicated Vercel cron. A failure here never affects the
// review engine result.
async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const summary = await processDueRequests(admin);

  let provisioning: { processed: number } = { processed: 0 };
  try {
    provisioning = await drainProvisioning(admin, { workerId: "cron:review-engine", maxRuns: 10, deadlineMs: 25_000 });
  } catch (err) {
    console.error("[cron/review-engine] provisioning drain error", err);
  }

  return NextResponse.json({ ok: true, ...summary, provisioning });
}

export async function GET(request: Request) {
  return run(request);
}

// Allow POST too (manual/queue triggers).
export async function POST(request: Request) {
  return run(request);
}
