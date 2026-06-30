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
  revalidatePath(`/dashboard/leads/${leadId}`);
}

export async function addNote(leadId: string, formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const { client } = await requireClient();
  if (!client) throw new Error("No client");

  const supabase = createClient();
  const { error } = await supabase.from("lead_notes").insert({
    lead_id: leadId,
    client_id: client.id,
    body,
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

  const updates = {
    business_name: String(formData.get("business_name") ?? "").trim(),
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
  const { error } = await supabase.from("clients").update(updates).eq("id", client.id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/settings");
  revalidatePath(`/site/${client.slug}`);
}

function nullify(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}
