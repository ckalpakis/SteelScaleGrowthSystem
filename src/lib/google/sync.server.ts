// =============================================================================
// Google Business Profile sync. Server-only.
//
// Stores OAuth tokens encrypted in company_integrations (provider
// 'google_business'), then syncs the location's reviews + aggregate rating into
// google_business_profiles / google_reviews, and records the run.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { refreshGoogleToken, type GoogleTokenResponse } from "@/lib/google/oauth";
import { getFirstAccount, getFirstLocation, listReviews } from "@/lib/google/client";

const PROVIDER = "google_business";

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
}

/** Persist tokens (encrypted) after the OAuth exchange. */
export async function saveGoogleTokens(
  admin: SupabaseClient,
  companyId: string,
  tokens: GoogleTokenResponse,
  email: string | null
): Promise<void> {
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();
  const row: Record<string, unknown> = {
    company_id: companyId,
    provider: PROVIDER,
    status: "connected",
    connected_user: email,
    access_token: encryptSecret(tokens.access_token),
    token_type: tokens.token_type ?? "Bearer",
    expires_at: expiresAt,
    last_error: null,
  };
  // Only overwrite the refresh token when Google returns a new one.
  if (tokens.refresh_token) row.refresh_token = encryptSecret(tokens.refresh_token);

  await admin.from("company_integrations").upsert(row, { onConflict: "company_id,provider" });
}

async function loadGoogleTokens(admin: SupabaseClient, companyId: string): Promise<GoogleTokens | null> {
  const { data } = await admin
    .from("company_integrations")
    .select("access_token, refresh_token, expires_at")
    .eq("company_id", companyId)
    .eq("provider", PROVIDER)
    .maybeSingle<{ access_token: string | null; refresh_token: string | null; expires_at: string | null }>();
  if (!data?.access_token) return null;
  try {
    return {
      accessToken: decryptSecret(data.access_token),
      refreshToken: data.refresh_token ? decryptSecret(data.refresh_token) : null,
      expiresAt: data.expires_at,
    };
  } catch {
    return null;
  }
}

// Ensure a non-expired access token, refreshing (and persisting) if needed.
async function freshAccessToken(admin: SupabaseClient, companyId: string, tokens: GoogleTokens): Promise<string> {
  const expMs = tokens.expiresAt ? new Date(tokens.expiresAt).getTime() : 0;
  if (expMs - Date.now() > 60_000) return tokens.accessToken;
  if (!tokens.refreshToken) return tokens.accessToken; // no refresh available; try as-is

  const refreshed = await refreshGoogleToken(tokens.refreshToken);
  const expiresAt = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString();
  await admin
    .from("company_integrations")
    .update({ access_token: encryptSecret(refreshed.access_token), expires_at: expiresAt })
    .eq("company_id", companyId)
    .eq("provider", PROVIDER);
  return refreshed.access_token;
}

export interface GoogleSyncResult {
  ok: boolean;
  error?: string;
  reviews?: number;
  averageRating?: number | null;
  totalReviews?: number;
}

/** Full reviews sync for a company. Records a sync job + connection state. */
export async function syncGoogleReviews(admin: SupabaseClient, companyId: string): Promise<GoogleSyncResult> {
  const started = new Date();
  const tokens = await loadGoogleTokens(admin, companyId);
  if (!tokens) return { ok: false, error: "Google is not connected." };

  const job = await startSyncJob(admin, companyId);

  try {
    const accessToken = await freshAccessToken(admin, companyId, tokens);

    const accountName = await getFirstAccount(accessToken);
    if (!accountName) throw new Error("No Google Business Profile account found for this login.");
    const location = await getFirstLocation(accessToken, accountName);
    if (!location) throw new Error("No business location found on this account.");

    const { reviews, averageRating, totalReviewCount } = await listReviews(accessToken, accountName, location.locationId);

    // Upsert the profile aggregate.
    await admin.from("google_business_profiles").upsert(
      {
        company_id: companyId,
        account_name: accountName,
        location_name: `${accountName}/locations/${location.locationId}`,
        location_title: location.title,
        average_rating: averageRating,
        total_reviews: totalReviewCount || reviews.length,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "company_id" }
    );

    // Upsert individual reviews.
    if (reviews.length) {
      await admin.from("google_reviews").upsert(
        reviews.map((r) => ({
          company_id: companyId,
          review_id: r.reviewId,
          reviewer_name: r.reviewerName,
          rating: r.rating,
          comment: r.comment,
          review_created_at: r.createTime,
          review_updated_at: r.updateTime,
        })),
        { onConflict: "company_id,review_id" }
      );
    }

    // Reflect success on the connection + sync job.
    await admin
      .from("integration_connections")
      .update({ status: "connected", last_sync_at: new Date().toISOString(), last_error: null })
      .eq("company_id", companyId)
      .eq("provider", PROVIDER);
    await finishSyncJob(admin, job, "succeeded", reviews.length, started);
    await log(admin, companyId, "info", "sync.google_reviews", `Synced ${reviews.length} reviews`, {
      averageRating,
      totalReviewCount,
    });

    return { ok: true, reviews: reviews.length, averageRating, totalReviews: totalReviewCount || reviews.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishSyncJob(admin, job, "failed", 0, started, message);
    await admin
      .from("integration_connections")
      .update({ status: "error", last_error: message })
      .eq("company_id", companyId)
      .eq("provider", PROVIDER);
    await log(admin, companyId, "error", "sync.google_reviews", message);
    return { ok: false, error: message };
  }
}

// ---------------------------------------------------------------- helpers
async function startSyncJob(admin: SupabaseClient, companyId: string): Promise<string | null> {
  const { data } = await admin
    .from("integration_sync_jobs")
    .insert({ company_id: companyId, provider: PROVIDER, job_type: "import_reviews", status: "running", started_at: new Date().toISOString() })
    .select("id")
    .single<{ id: string }>();
  return data?.id ?? null;
}

async function finishSyncJob(
  admin: SupabaseClient,
  jobId: string | null,
  status: "succeeded" | "failed",
  processed: number,
  started: Date,
  error?: string
): Promise<void> {
  if (!jobId) return;
  await admin
    .from("integration_sync_jobs")
    .update({
      status,
      records_processed: processed,
      records_failed: status === "failed" ? 1 : 0,
      finished_at: new Date().toISOString(),
      error: error ?? null,
      stats: { durationMs: Date.now() - started.getTime() },
    })
    .eq("id", jobId);
}

async function log(
  admin: SupabaseClient,
  companyId: string,
  level: string,
  action: string,
  message: string,
  context?: Record<string, unknown>
): Promise<void> {
  await admin.from("integration_logs").insert({ company_id: companyId, provider: PROVIDER, level, action, message, context: context ?? {} });
}
