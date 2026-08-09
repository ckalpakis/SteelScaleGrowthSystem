"use server";

import { revalidatePath } from "next/cache";

import { requireAgencyAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createDirectory,
  deleteListing,
  importListings,
  setListingStatus,
  setListingTier,
  updateDirectory,
  type DirectoryPatch,
} from "@/lib/directory/admin.server";
import { csvToListings } from "@/lib/directory/csv";
import type { ListingStatus, ListingTier } from "@/lib/directory/types";

export type CreateDirectoryState = { ok: true; id: string } | { ok: false; error: string } | { ok: null };

export async function createDirectoryAction(_prev: CreateDirectoryState, formData: FormData): Promise<CreateDirectoryState> {
  await requireAgencyAdmin();
  const name = String(formData.get("name") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const res = await createDirectory(createAdminClient(), name, slug);
  if (!res.ok || !res.id) return { ok: false, error: res.message };
  revalidatePath("/dashboard/directories");
  return { ok: true, id: res.id };
}

export async function updateDirectoryAction(id: string, patch: DirectoryPatch): Promise<{ ok: boolean; message: string }> {
  await requireAgencyAdmin();
  const res = await updateDirectory(createAdminClient(), id, patch);
  revalidatePath(`/dashboard/directories/${id}`);
  return res;
}

export async function importListingsAction(directoryId: string, csvText: string): Promise<{ ok: boolean; message: string }> {
  await requireAgencyAdmin();
  const listings = csvToListings(csvText);
  const res = await importListings(createAdminClient(), directoryId, listings);
  revalidatePath(`/dashboard/directories/${directoryId}`);
  return { ok: res.ok, message: res.skipped > 0 ? `${res.message} (${res.skipped} over the import cap were skipped.)` : res.message };
}

export async function setListingTierAction(directoryId: string, listingId: string, tier: ListingTier): Promise<void> {
  await requireAgencyAdmin();
  await setListingTier(createAdminClient(), listingId, tier);
  revalidatePath(`/dashboard/directories/${directoryId}`);
}

export async function setListingStatusAction(directoryId: string, listingId: string, status: ListingStatus): Promise<void> {
  await requireAgencyAdmin();
  await setListingStatus(createAdminClient(), listingId, status);
  revalidatePath(`/dashboard/directories/${directoryId}`);
}

export async function deleteListingAction(directoryId: string, listingId: string): Promise<void> {
  await requireAgencyAdmin();
  await deleteListing(createAdminClient(), listingId);
  revalidatePath(`/dashboard/directories/${directoryId}`);
}
