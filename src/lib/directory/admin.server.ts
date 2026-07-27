// =============================================================================
// Directory — admin write operations. Server-only (service-role).
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

import { slugify, uniqueSlug } from "@/lib/directory/slug";
import type { Directory, DirectoryListing, ListingInput, ListingStatus, ListingTier } from "@/lib/directory/types";

/** Max listings accepted in a single import (guards memory/time). */
export const IMPORT_MAX = 2000;

export async function createDirectory(admin: SupabaseClient, name: string, rawSlug?: string): Promise<{ ok: boolean; id?: string; message: string }> {
  const clean = name.trim();
  if (!clean) return { ok: false, message: "Enter a directory name." };
  const slug = slugify(rawSlug || clean) || "directory";

  const { data: existing } = await admin.from("directories").select("id").eq("slug", slug).maybeSingle<{ id: string }>();
  if (existing) return { ok: false, message: `The slug "${slug}" is already taken.` };

  const { data, error } = await admin.from("directories").insert({ name: clean, slug }).select("id").single<{ id: string }>();
  if (error || !data) return { ok: false, message: "Could not create the directory." };
  return { ok: true, id: data.id, message: "Directory created." };
}

export type DirectoryPatch = Partial<
  Pick<
    Directory,
    | "name"
    | "tagline"
    | "hero_title"
    | "hero_subtitle"
    | "hero_image_url"
    | "logo_url"
    | "primary_color"
    | "meta_title"
    | "meta_description"
    | "published"
    | "domain"
  >
>;

export async function updateDirectory(admin: SupabaseClient, id: string, patch: DirectoryPatch): Promise<{ ok: boolean; message: string }> {
  const clean: Record<string, unknown> = { ...patch };
  if (patch.primary_color !== undefined) {
    const c = patch.primary_color.trim();
    if (!/^#?[0-9a-fA-F]{6}$/.test(c)) return { ok: false, message: "Brand color must be a 6-digit hex like #1D4ED8." };
    clean.primary_color = c.startsWith("#") ? c : `#${c}`;
  }
  if (patch.domain !== undefined) clean.domain = (patch.domain ?? "").trim().toLowerCase() || null;
  const { error } = await admin.from("directories").update(clean).eq("id", id);
  if (error) return { ok: false, message: "Could not save. (A domain may already be in use.)" };
  return { ok: true, message: "Saved." };
}

/** Insert many listings, generating slugs unique within the directory. */
export async function importListings(admin: SupabaseClient, directoryId: string, listings: ListingInput[]): Promise<{ ok: boolean; imported: number; skipped: number; message: string }> {
  if (listings.length === 0) return { ok: false, imported: 0, skipped: 0, message: "No valid rows found in the file." };
  const capped = listings.slice(0, IMPORT_MAX);
  const skipped = listings.length - capped.length;

  // Seed the taken-set with existing slugs so we never collide.
  const { data: existing } = await admin.from("directory_listings").select("slug").eq("directory_id", directoryId).returns<{ slug: string }[]>();
  const taken = new Set<string>((existing ?? []).map((r) => r.slug));

  const rows = capped.map((l) => ({
    directory_id: directoryId,
    slug: uniqueSlug(l.business_name, taken),
    business_name: l.business_name,
    category: l.category ?? null,
    description: l.description ?? null,
    address: l.address ?? null,
    city: l.city ?? null,
    state: l.state ?? null,
    postal_code: l.postal_code ?? null,
    phone: l.phone ?? null,
    website: l.website ?? null,
    email: l.email ?? null,
    image_url: l.image_url ?? null,
    tier: l.tier ?? "free",
    status: "published" as ListingStatus,
  }));

  const { error } = await admin.from("directory_listings").insert(rows);
  if (error) return { ok: false, imported: 0, skipped, message: "Import failed while saving listings." };
  return { ok: true, imported: rows.length, skipped, message: `Imported ${rows.length} listing${rows.length === 1 ? "" : "s"}.` };
}

export async function listAllListings(admin: SupabaseClient, directoryId: string, limit = 500): Promise<DirectoryListing[]> {
  const { data } = await admin
    .from("directory_listings")
    .select("*")
    .eq("directory_id", directoryId)
    .order("tier", { ascending: true })
    .order("business_name", { ascending: true })
    .limit(limit)
    .returns<DirectoryListing[]>();
  return data ?? [];
}

export async function setListingTier(admin: SupabaseClient, id: string, tier: ListingTier): Promise<void> {
  await admin.from("directory_listings").update({ tier }).eq("id", id);
}

export async function setListingStatus(admin: SupabaseClient, id: string, status: ListingStatus): Promise<void> {
  await admin.from("directory_listings").update({ status }).eq("id", id);
}

export async function deleteListing(admin: SupabaseClient, id: string): Promise<void> {
  await admin.from("directory_listings").delete().eq("id", id);
}
