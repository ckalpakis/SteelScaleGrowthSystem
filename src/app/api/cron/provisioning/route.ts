import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { drainProvisioning } from "@/lib/onboarding/provisioning/drain.server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Standalone provisioning drain. NOT registered as a Vercel cron (the plan's
// cron slots are used by the review jobs, which also drain provisioning). This
// endpoint stays available for an external scheduler or a manual trigger.
// Protected by CRON_SECRET (sent as a Bearer token).
async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { processed, results } = await drainProvisioning(createAdminClient(), { workerId: "cron:manual" });
    return NextResponse.json({ ok: true, processed, results });
  } catch (err) {
    // Never leak internals; log server-side only.
    console.error("[cron/provisioning] drain error", err);
    return NextResponse.json({ ok: false, error: "Provisioning drain error." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return run(request);
}
export async function POST(request: Request) {
  return run(request);
}
