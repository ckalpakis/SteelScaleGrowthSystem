"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClient } from "@/lib/auth";
import type { LeadStatus } from "@/lib/types";
import { PIPELINE_STAGES } from "@/lib/types";
import { buildClientSettings } from "@/lib/settings";

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

export async function updateLeadValue(leadId: string, formData: FormData) {
  const raw = String(formData.get("estimate_value") ?? "").replace(/[$,\s]/g, "").trim();
  const parsed = raw === "" ? null : Number(raw);
  if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
    throw new Error("Enter a valid dollar amount.");
  }

  const supabase = createClient();
  const { error } = await supabase.from("leads").update({ estimate_value: parsed }).eq("id", leadId);
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

  let settings: ReturnType<typeof buildClientSettings>["settings"];
  let businessName: string | null;
  try {
    ({ settings, businessName } = buildClientSettings(formData, client.id));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON." };
  }

  const name = businessName ?? client.name;
  const supabase = createClient();

  // Upsert settings (a client may not have a settings row yet) and keep the
  // canonical business name on the client record in sync.
  const [{ error: settingsError }, { error: clientError }] = await Promise.all([
    supabase.from("client_settings").upsert(settings, { onConflict: "client_id" }),
    supabase.from("clients").update({ name }).eq("id", client.id),
  ]);
  if (settingsError) return { ok: false, error: settingsError.message };
  if (clientError) return { ok: false, error: clientError.message };

  revalidatePath("/dashboard/settings");
  revalidatePath(`/site/${client.slug}`);
  return { ok: true };
}
