"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/reputation.server";
import type { ReviewTemplate } from "@/lib/reputation";

const PATH = "/dashboard/reputation/templates";

export type TemplateResult = { ok: true; template: ReviewTemplate } | { ok: false; error: string };

export interface TemplateInput {
  name: string;
  body: string;
}

function validate(input: TemplateInput): string | null {
  if (!input.name.trim()) return "Template name is required.";
  if (!input.body.trim()) return "Message body is required.";
  return null;
}

export async function createTemplate(input: TemplateInput): Promise<TemplateResult> {
  const err = validate(input);
  if (err) return { ok: false, error: err };

  const companyId = await getCurrentCompanyId();
  if (!companyId) return { ok: false, error: "No company is linked to your account." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("review_templates")
    .insert({ company_id: companyId, name: input.name.trim(), channel: "sms", body: input.body.trim() })
    .select("*")
    .single<ReviewTemplate>();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not create the template." };
  revalidatePath(PATH);
  return { ok: true, template: data };
}

export async function updateTemplate(id: string, input: TemplateInput): Promise<TemplateResult> {
  const err = validate(input);
  if (err) return { ok: false, error: err };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("review_templates")
    .update({ name: input.name.trim(), body: input.body.trim() })
    .eq("id", id)
    .select("*")
    .single<ReviewTemplate>();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not save the template." };
  revalidatePath(PATH);
  return { ok: true, template: data };
}

export async function deleteTemplate(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("review_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

export async function duplicateTemplate(id: string): Promise<TemplateResult> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { ok: false, error: "No company is linked to your account." };

  const supabase = createClient();
  const { data: orig } = await supabase
    .from("review_templates")
    .select("name, body, channel")
    .eq("id", id)
    .single<{ name: string; body: string; channel: string }>();
  if (!orig) return { ok: false, error: "Template not found." };

  const { data, error } = await supabase
    .from("review_templates")
    .insert({ company_id: companyId, name: `${orig.name} (copy)`, channel: orig.channel, body: orig.body })
    .select("*")
    .single<ReviewTemplate>();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not duplicate the template." };
  revalidatePath(PATH);
  return { ok: true, template: data };
}
