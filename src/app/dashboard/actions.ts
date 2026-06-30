"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClient } from "@/lib/auth";
import type { LeadStatus } from "@/lib/types";
import { PIPELINE_STAGES } from "@/lib/types";

// All mutations run through RLS using the signed-in user's session, so a user
// can only ever touch their own client's data.

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  if (!PIPELINE_STAGES.some((s) => s.value === status)) {
    throw new Error("Invalid status");
  }
  const supabase = createClient();
  const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
  revalidatePath(`/dashboard/leads/${leadId}`);
}

export async function addNote(leadId: string, formData: FormData) {
  const note = String(formData.get("note") ?? "").trim();
  if (!note) return;

  const { userId } = await requireClient();

  const supabase = createClient();
  const { error } = await supabase.from("lead_notes").insert({
    lead_id: leadId,
    user_id: userId,
    note,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/leads/${leadId}`);
}

export async function deleteNote(noteId: string, leadId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("lead_notes").delete().eq("id", noteId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/leads/${leadId}`);
}

export type SettingsState = { ok: boolean; error?: string };

// Full settings update — handles every website content field, including the
// JSON-edited services and gallery. Returns a result state for useFormState so
// validation errors show inline instead of crashing.
export async function updateSettings(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const { client } = await requireClient();
  if (!client) return { ok: false, error: "Your account isn't linked to a client." };

  let service_details: unknown;
  let gallery: unknown;
  try {
    service_details = parseJsonArray(formData.get("service_details"), "Services");
    gallery = parseJsonArray(formData.get("gallery"), "Gallery");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON." };
  }

  const business_name = nullify(formData.get("business_name")) ?? client.name;

  const settings = {
    client_id: client.id,
    business_name,
    phone: nullify(formData.get("phone")),
    email: nullify(formData.get("email")),
    address: nullify(formData.get("address")),
    hours: nullify(formData.get("hours")),
    logo_url: nullify(formData.get("logo_url")),
    brand_color: nullify(formData.get("brand_color")) ?? "#1e3a8a",
    hero_image_url: nullify(formData.get("hero_image_url")),
    tagline: nullify(formData.get("tagline")),
    primary_location: nullify(formData.get("primary_location")),
    hero_headline: nullify(formData.get("hero_headline")),
    hero_subheadline: nullify(formData.get("hero_subheadline")),
    promo_text: nullify(formData.get("promo_text")),
    services: lines(formData.get("services")),
    service_details,
    service_area: nullify(formData.get("service_area")),
    service_areas: lines(formData.get("service_areas")),
    gallery,
    value_props: lines(formData.get("value_props")),
    badges: lines(formData.get("badges")),
    about_headline: nullify(formData.get("about_headline")),
    about_text: nullify(formData.get("about_text")),
    rating: toNum(formData.get("rating")),
    review_count: toInt(formData.get("review_count")),
    google_review_link: nullify(formData.get("google_review_link")),
    facebook_url: nullify(formData.get("facebook_url")),
    instagram_url: nullify(formData.get("instagram_url")),
    google_business_url: nullify(formData.get("google_business_url")),
  };

  const supabase = createClient();

  // Upsert settings (a client may not have a settings row yet) and keep the
  // canonical business name on the client record in sync.
  const [{ error: settingsError }, { error: clientError }] = await Promise.all([
    supabase.from("client_settings").upsert(settings, { onConflict: "client_id" }),
    supabase.from("clients").update({ name: business_name }).eq("id", client.id),
  ]);
  if (settingsError) return { ok: false, error: settingsError.message };
  if (clientError) return { ok: false, error: clientError.message };

  revalidatePath("/dashboard/settings");
  revalidatePath(`/site/${client.slug}`);
  return { ok: true };
}

function nullify(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

// One item per line → trimmed array (avoids comma-splitting issues with text
// like "Marietta, GA" or value props that contain commas).
function lines(v: FormDataEntryValue | null): string[] {
  return String(v ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toNum(v: FormDataEntryValue | null): number | null {
  const n = parseFloat(String(v ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

function toInt(v: FormDataEntryValue | null): number | null {
  const n = parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) ? n : null;
}

// Parse a JSON array field; blank means an empty array. Throws a friendly error
// otherwise so the form can show it.
function parseJsonArray(v: FormDataEntryValue | null, label: string): unknown[] {
  const raw = String(v ?? "").trim();
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${label}: invalid JSON. Check for missing commas or quotes.`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${label}: must be a JSON array (starts with [ and ends with ]).`);
  }
  return parsed;
}
