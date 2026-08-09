import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReviewRequest } from "@/lib/reviewRequests";
import type { Client, ClientSettings, Lead } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily cron (see vercel.json). For every client with automation enabled, find
// leads that were won at least `auto_review_delay_days` ago and haven't been
// asked yet, then send the review request. Protected by CRON_SECRET — Vercel
// Cron sends it automatically as a Bearer token when the env var is set.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: settingsRows } = await supabase
    .from("client_settings")
    .select("*")
    .eq("auto_review_enabled", true)
    .returns<ClientSettings[]>();

  if (!settingsRows?.length) return NextResponse.json({ ok: true, sent: 0 });

  const clientIds = settingsRows.map((s) => s.client_id);
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .in("id", clientIds)
    .returns<Client[]>();
  const clientMap = new Map((clients ?? []).map((c) => [c.id, c]));

  const now = Date.now();
  let sent = 0;

  for (const settings of settingsRows) {
    const client = clientMap.get(settings.client_id);
    // Automated review requests are a Tier 2+ feature.
    if (!client || client.tier < 2 || !settings.google_review_link) continue;

    const delayDays = settings.auto_review_delay_days ?? 3;
    const cutoff = new Date(now - delayDays * 86_400_000).toISOString();

    const { data: leads } = await supabase
      .from("leads")
      .select("*")
      .eq("client_id", settings.client_id)
      .eq("status", "won")
      .is("review_requested_at", null)
      .not("won_at", "is", null)
      .lte("won_at", cutoff)
      .returns<Lead[]>();

    for (const lead of leads ?? []) {
      const res = await sendReviewRequest(supabase, client, settings, lead);
      if (res.sent) sent++;
    }
  }

  return NextResponse.json({ ok: true, sent });
}
