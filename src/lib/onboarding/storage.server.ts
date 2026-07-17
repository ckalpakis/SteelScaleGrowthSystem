// =============================================================================
// Client onboarding — logo storage. Server-only (service-role storage).
//
// Uploads a validated logo to the project's existing object storage and returns
// a STABLE public URL, suitable for later use in review-request media and
// downstream configuration. The client never receives storage credentials.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

import { ONBOARDING_LOGO_PREFIX, ONBOARDING_MEDIA_BUCKET } from "@/lib/onboarding/config";
import type { LogoContentType } from "@/lib/onboarding/config";

export interface StoredLogo {
  url: string;
  path: string;
}

/**
 * Upload validated logo bytes for an invitation and return its public URL.
 * The object path is namespaced by invitation id so uploads never collide.
 */
export async function uploadOnboardingLogo(
  admin: SupabaseClient,
  invitationId: string,
  bytes: Uint8Array,
  contentType: LogoContentType,
  ext: string,
): Promise<StoredLogo> {
  const path = `${ONBOARDING_LOGO_PREFIX}/${invitationId}/logo-${Date.now()}.${ext}`;

  const { error } = await admin.storage.from(ONBOARDING_MEDIA_BUCKET).upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (error) {
    throw new Error(`Logo upload failed: ${error.message}`);
  }

  const { data } = admin.storage.from(ONBOARDING_MEDIA_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}
