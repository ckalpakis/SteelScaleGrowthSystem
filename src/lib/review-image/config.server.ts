// =============================================================================
// Personalized review image — DB config + base-image storage. Server-only.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

import { ONBOARDING_MEDIA_BUCKET } from "@/lib/onboarding/config";
import { validateLogoBytes } from "@/lib/onboarding/logo";
import type { ReviewImageConfig, TextPosition } from "@/lib/review-image";

const TABLE = "client_review_images";

interface Row {
  client_account_id: string;
  enabled: boolean;
  base_image_path: string | null;
  base_image_url: string | null;
  name_template: string;
  text_color: string;
  font_size: number;
  text_position: TextPosition;
}

function toConfig(r: Row): ReviewImageConfig {
  return {
    enabled: r.enabled,
    baseImageUrl: r.base_image_url,
    baseImagePath: r.base_image_path,
    nameTemplate: r.name_template,
    textColor: r.text_color,
    fontSize: r.font_size,
    textPosition: r.text_position,
  };
}

/** Load a client's personalized-image config, or null if none exists. */
export async function getReviewImageConfig(admin: SupabaseClient, clientAccountId: string): Promise<ReviewImageConfig | null> {
  const { data } = await admin.from(TABLE).select("*").eq("client_account_id", clientAccountId).maybeSingle<Row>();
  return data ? toConfig(data) : null;
}

export interface ReviewImageConfigPatch {
  enabled?: boolean;
  nameTemplate?: string;
  textColor?: string;
  fontSize?: number;
  textPosition?: TextPosition;
}

/** Upsert the text/enable config (never touches the base image). */
export async function saveReviewImageConfig(admin: SupabaseClient, clientAccountId: string, patch: ReviewImageConfigPatch): Promise<{ ok: boolean; message: string }> {
  const row: Record<string, unknown> = { client_account_id: clientAccountId };
  if (patch.enabled !== undefined) row.enabled = patch.enabled;
  if (patch.nameTemplate !== undefined) row.name_template = patch.nameTemplate.slice(0, 200) || "{name}";
  if (patch.textColor !== undefined) {
    if (!/^#?[0-9a-fA-F]{6}$/.test(patch.textColor.trim())) return { ok: false, message: "Enter a 6-digit hex color like #FFFFFF." };
    row.text_color = patch.textColor.trim().startsWith("#") ? patch.textColor.trim() : `#${patch.textColor.trim()}`;
  }
  if (patch.fontSize !== undefined) {
    const n = Math.round(patch.fontSize);
    if (!Number.isFinite(n) || n < 12 || n > 300) return { ok: false, message: "Font size must be between 12 and 300." };
    row.font_size = n;
  }
  if (patch.textPosition !== undefined) row.text_position = patch.textPosition;

  const { error } = await admin.from(TABLE).upsert(row, { onConflict: "client_account_id" });
  if (error) return { ok: false, message: "Could not save settings." };
  return { ok: true, message: "Saved." };
}

/** Validate + store a base image and record its path/url on the config row. */
export async function uploadReviewImageBase(admin: SupabaseClient, clientAccountId: string, bytes: Uint8Array): Promise<{ ok: boolean; message: string; url?: string }> {
  const check = validateLogoBytes(bytes); // same PNG/JPEG/WebP + size rules
  if (!check.ok) return { ok: false, message: check.error };

  const path = `review-image/${clientAccountId}/base-${Date.now()}.${check.ext}`;
  const { error: upErr } = await admin.storage.from(ONBOARDING_MEDIA_BUCKET).upload(path, check.bytes, { contentType: check.contentType, upsert: true });
  if (upErr) return { ok: false, message: "Upload failed." };

  const { data } = admin.storage.from(ONBOARDING_MEDIA_BUCKET).getPublicUrl(path);
  const { error } = await admin.from(TABLE).upsert(
    { client_account_id: clientAccountId, base_image_path: path, base_image_url: data.publicUrl },
    { onConflict: "client_account_id" },
  );
  if (error) return { ok: false, message: "Could not save the image." };
  return { ok: true, message: "Base image uploaded.", url: data.publicUrl };
}
