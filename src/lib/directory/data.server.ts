// =============================================================================
// Directory — read access. Server-only (service-role). Public pages call these
// with `publishedOnly` so only live content is ever rendered.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Directory, DirectoryListing } from "@/lib/directory/types";

export async function listDirectories(admin: SupabaseClient): Promise<Directory[]> {
  const { data } = await admin.from("directories").select("*").order("created_at", { ascending: false }).returns<Directory[]>();
  return data ?? [];
}

export async function getDirectoryById(admin: SupabaseClient, id: string): Promise<Directory | null> {
  const { data } = await admin.from("directories").select("*").eq("id", id).maybeSingle<Directory>();
  return data ?? null;
}

/**
 * The directory shown at the site root (`/`). Uses PRIMARY_DIRECTORY_SLUG when
 * set, otherwise the most recently created published directory. Null if none.
 */
export async function getPrimaryDirectory(admin: SupabaseClient): Promise<Directory | null> {
  const slug = process.env.PRIMARY_DIRECTORY_SLUG;
  if (slug) {
    const byEnv = await getDirectoryBySlug(admin, slug, { publishedOnly: true });
    if (byEnv) return byEnv;
  }
  const { data } = await admin
    .from("directories")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Directory>();
  return data ?? null;
}

export async function getDirectoryBySlug(admin: SupabaseClient, slug: string, opts: { publishedOnly?: boolean } = {}): Promise<Directory | null> {
  let q = admin.from("directories").select("*").eq("slug", slug);
  if (opts.publishedOnly) q = q.eq("published", true);
  const { data } = await q.maybeSingle<Directory>();
  return data ?? null;
}

export interface ListingQuery {
  category?: string;
  q?: string;
  publishedOnly?: boolean;
  limit?: number;
}

export async function getListings(admin: SupabaseClient, directoryId: string, opts: ListingQuery = {}): Promise<DirectoryListing[]> {
  let q = admin.from("directory_listings").select("*").eq("directory_id", directoryId);
  if (opts.publishedOnly !== false) q = q.eq("status", "published");
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.q) q = q.ilike("business_name", `%${opts.q}%`);
  q = q.order("tier", { ascending: true }).order("sort_order", { ascending: true }).order("business_name", { ascending: true });
  if (opts.limit) q = q.limit(opts.limit);
  const { data } = await q.returns<DirectoryListing[]>();
  return data ?? [];
}

export async function getListingBySlug(admin: SupabaseClient, directoryId: string, slug: string): Promise<DirectoryListing | null> {
  const { data } = await admin
    .from("directory_listings")
    .select("*")
    .eq("directory_id", directoryId)
    .eq("slug", slug)
    .maybeSingle<DirectoryListing>();
  return data ?? null;
}

/** Distinct published categories for a directory (for the menu / category pages). */
export async function getCategories(admin: SupabaseClient, directoryId: string): Promise<string[]> {
  const { data } = await admin
    .from("directory_listings")
    .select("category")
    .eq("directory_id", directoryId)
    .eq("status", "published")
    .not("category", "is", null)
    .returns<{ category: string | null }[]>();
  const set = new Set<string>();
  for (const r of data ?? []) if (r.category) set.add(r.category);
  return [...set].sort((a, b) => a.localeCompare(b));
}
