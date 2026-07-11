import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processDueRequests } from "@/lib/reputation.engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Scheduled background job (see vercel.json). Advances every review-request
// workflow run that is due: sends the initial SMS after the configured delay,
// then reminders on their cadence, honoring stop conditions and max reminders.
// Protected by CRON_SECRET — Vercel Cron sends it as a Bearer token.
async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const summary = await processDueRequests(admin);
  return NextResponse.json({ ok: true, ...summary });
}

export async function GET(request: Request) {
  return run(request);
}

// Allow POST too (manual/queue triggers).
export async function POST(request: Request) {
  return run(request);
}
