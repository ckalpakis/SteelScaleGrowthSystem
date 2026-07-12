"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCompanyId } from "@/lib/reputation.server";
import { integrationDef } from "@/lib/integrations";
import { syncGoogleReviews } from "@/lib/google/sync.server";

const PATH = "/dashboard/integrations/dashboard";

export type SyncResult = { ok: true } | { ok: false; error: string };

// Enqueue a manual sync. Creates queued integration_sync_jobs for the core
// object types; a background worker picks them up. No live API call here.
export async function syncNow(provider: string): Promise<SyncResult> {
  if (!integrationDef(provider)) return { ok: false, error: "Unknown integration." };

  const companyId = await getCurrentCompanyId();
  if (!companyId) return { ok: false, error: "No company is linked to your account." };

  const admin = createAdminClient();

  // Confirm the integration is connected for this company (via the RLS client).
  const supabase = createClient();
  const { data: conn } = await supabase
    .from("integration_connections")
    .select("status")
    .eq("company_id", companyId)
    .eq("provider", provider)
    .maybeSingle<{ status: string }>();
  if (conn?.status !== "connected") return { ok: false, error: "Connect this integration before syncing." };

  // Google Business Profile has a live sync — run it now.
  if (provider === "google_business") {
    const res = await syncGoogleReviews(admin, companyId);
    revalidatePath(PATH);
    return res.ok ? { ok: true } : { ok: false, error: res.error ?? "Google sync failed." };
  }

  const jobTypes = ["import_customers", "import_jobs", "import_appointments"];
  const rows = jobTypes.map((job_type) => ({
    company_id: companyId,
    provider,
    job_type,
    status: "queued",
    scheduled_at: new Date().toISOString(),
  }));

  const { error } = await admin.from("integration_sync_jobs").insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath(PATH);
  return { ok: true };
}
