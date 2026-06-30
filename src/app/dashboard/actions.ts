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

export async function updateSettings(formData: FormData) {
  const { client } = await requireClient();
  if (!client) throw new Error("No client");

  const services = String(formData.get("services") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const business_name = String(formData.get("business_name") ?? "").trim() || client.name;

  const settings = {
    client_id: client.id,
    business_name,
    phone: nullify(formData.get("phone")),
    email: nullify(formData.get("email")),
    logo_url: nullify(formData.get("logo_url")),
    brand_color: nullify(formData.get("brand_color")) ?? "#1e3a8a",
    google_review_link: nullify(formData.get("google_review_link")),
    service_area: nullify(formData.get("service_area")),
    hero_headline: nullify(formData.get("hero_headline")),
    hero_subheadline: nullify(formData.get("hero_subheadline")),
    services,
  };

  const supabase = createClient();

  // Upsert settings (a client may not have a settings row yet) and keep the
  // canonical business name on the client record in sync.
  const [{ error: settingsError }, { error: clientError }] = await Promise.all([
    supabase.from("client_settings").upsert(settings, { onConflict: "client_id" }),
    supabase.from("clients").update({ name: business_name }).eq("id", client.id),
  ]);
  if (settingsError) throw new Error(settingsError.message);
  if (clientError) throw new Error(clientError.message);

  revalidatePath("/dashboard/settings");
  revalidatePath(`/site/${client.slug}`);
}

function nullify(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}
