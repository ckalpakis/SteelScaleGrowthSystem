import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createProvisioningEngine } from "@/lib/onboarding/provisioning/factory.server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Background provisioning drain (see vercel.json). Claims and processes queued
// provisioning runs one at a time until none remain or the time budget is spent.
// Protected by CRON_SECRET (Vercel Cron sends it as a Bearer token). Also
// callable via POST for manual/queue triggers.
async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const engine = createProvisioningEngine(admin, { workerId: "cron" });

  const deadline = Date.now() + 50_000; // stay within maxDuration
  const results: { runId: string; result: string }[] = [];
  let processed = 0;

  try {
    while (Date.now() < deadline && processed < 25) {
      const next = await engine.provisionNext();
      if (!next) break;
      results.push({ runId: next.runId, result: next.outcome.result });
      processed += 1;
    }
  } catch (err) {
    // Never leak internals; log server-side only.
    console.error("[cron/provisioning] drain error", err);
    return NextResponse.json({ ok: false, processed, error: "Provisioning drain error." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, processed, results });
}

export async function GET(request: Request) {
  return run(request);
}
export async function POST(request: Request) {
  return run(request);
}
