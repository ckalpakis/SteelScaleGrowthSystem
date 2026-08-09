// =============================================================================
// Client onboarding — invitation service. Server-only (service-role client).
//
// Creates expiring, single-use invitation links; resolves a presented token to
// an invitation; marks first access; and revokes. Only a token HASH is stored.
//
// Enumeration safety: resolveInvitation() distinguishes reasons for INTERNAL
// use, but callers surface a single generic message for every failure so a
// guesser can't tell whether a token ever existed.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

import { INVITATION_TTL_DAYS } from "@/lib/onboarding/config";
import { generateInvitationToken, hashInvitationToken, looksLikeToken } from "@/lib/onboarding/tokens";
import type { InvitationStatus, OnboardingInvitation } from "@/lib/onboarding/types";

const TABLE = "onboarding_invitations";

export interface CreateInvitationParams {
  clientEmail?: string | null;
  createdByUserId?: string | null;
  ttlDays?: number;
}

export interface CreateInvitationResult {
  invitation: OnboardingInvitation;
  /** The raw link token — returned ONCE, never stored. Show it, then forget it. */
  rawToken: string;
}

/** Create a new invitation and return the raw token exactly once. */
export async function createInvitation(
  admin: SupabaseClient,
  params: CreateInvitationParams = {},
): Promise<CreateInvitationResult> {
  const { rawToken, tokenHash } = generateInvitationToken();
  const ttl = params.ttlDays ?? INVITATION_TTL_DAYS;
  const expiresAt = new Date(Date.now() + ttl * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from(TABLE)
    .insert({
      public_token_hash: tokenHash,
      client_email: params.clientEmail?.trim().toLowerCase() || null,
      status: "pending",
      expires_at: expiresAt,
      created_by_user_id: params.createdByUserId ?? null,
    })
    .select("*")
    .single<OnboardingInvitation>();

  if (error || !data) {
    throw new Error(`Could not create invitation: ${error?.message ?? "unknown error"}`);
  }
  return { invitation: data, rawToken };
}

export type ResolveReason = "valid" | "not_found" | "expired" | "revoked" | "submitted";

export type ResolveInvitationResult =
  | { reason: "valid"; invitation: OnboardingInvitation }
  | { reason: Exclude<ResolveReason, "valid">; invitation: OnboardingInvitation | null };

/**
 * Resolve a presented raw token to an invitation and classify its usability.
 * Lazily flips an expired-but-not-yet-marked invitation to `expired`.
 * NEVER trust the returned `reason` for a user-facing message — surface a
 * single generic message for every non-`valid` outcome (see route handlers).
 */
export async function resolveInvitation(admin: SupabaseClient, rawToken: string): Promise<ResolveInvitationResult> {
  if (!looksLikeToken(rawToken)) return { reason: "not_found", invitation: null };

  const tokenHash = hashInvitationToken(rawToken);
  const { data } = await admin.from(TABLE).select("*").eq("public_token_hash", tokenHash).maybeSingle<OnboardingInvitation>();

  if (!data) return { reason: "not_found", invitation: null };

  if (data.status === "revoked") return { reason: "revoked", invitation: data };
  if (data.status === "submitted") return { reason: "submitted", invitation: data };

  const expired = data.status === "expired" || new Date(data.expires_at).getTime() <= Date.now();
  if (expired) {
    if (data.status !== "expired") {
      await admin.from(TABLE).update({ status: "expired" }).eq("id", data.id);
    }
    return { reason: "expired", invitation: { ...data, status: "expired" } };
  }

  return { reason: "valid", invitation: data };
}

/** Mark an invitation opened on first access (pending → opened). Idempotent. */
export async function markInvitationOpened(admin: SupabaseClient, invitationId: string): Promise<void> {
  await admin
    .from(TABLE)
    .update({ status: "opened", opened_at: new Date().toISOString() })
    .eq("id", invitationId)
    .eq("status", "pending"); // only the first open transitions; later opens are no-ops
}

/** Revoke an invitation unless it was already submitted. */
export async function revokeInvitation(admin: SupabaseClient, invitationId: string): Promise<void> {
  const { error } = await admin
    .from(TABLE)
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .neq("status", "submitted");
  if (error) throw new Error(`Could not revoke invitation: ${error.message}`);
}

/** List invitations for the admin view, newest first. */
export async function listInvitations(admin: SupabaseClient, limit = 100): Promise<OnboardingInvitation[]> {
  const { data, error } = await admin
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<OnboardingInvitation[]>();
  if (error) throw new Error(`Could not list invitations: ${error.message}`);
  return data ?? [];
}

/** Human-friendly label for an invitation status (admin UI). */
export function invitationStatusLabel(status: InvitationStatus): string {
  switch (status) {
    case "pending":
      return "Not opened";
    case "opened":
      return "Opened";
    case "submitted":
      return "Completed";
    case "expired":
      return "Expired";
    case "revoked":
      return "Revoked";
  }
}
