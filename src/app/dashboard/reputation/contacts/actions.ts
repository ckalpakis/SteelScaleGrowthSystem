"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCompanyId, generateShortCode } from "@/lib/reputation.server";
import { enrollByTrigger, enrollContactInWorkflow, type EnrollResult } from "@/lib/reputation.engine";
import { type ReviewContact } from "@/lib/reputation";

const PATH = "/dashboard/reputation/contacts";

export interface ContactInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  service?: string | null;
  completed_job_date?: string | null;
}

export type CreateResult = { ok: true; contact: ReviewContact } | { ok: false; error: string };

function clean(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  return s.length ? s : null;
}

export async function createContact(input: ContactInput): Promise<CreateResult> {
  const name = (input.name ?? "").trim();
  if (!name) return { ok: false, error: "Name is required." };

  const companyId = await getCurrentCompanyId();
  if (!companyId) return { ok: false, error: "No company is linked to your account." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("review_contacts")
    .insert({
      company_id: companyId,
      name,
      email: clean(input.email),
      phone: clean(input.phone),
      service: clean(input.service),
      completed_job_date: clean(input.completed_job_date),
      source: "manual",
    })
    .select("*")
    .single<ReviewContact>();

  if (error || !data) {
    const msg = error?.code === "23505" ? "A contact with that email or phone already exists." : error?.message;
    return { ok: false, error: msg ?? "Could not create the contact." };
  }

  // Fire any "contact imported" workflows (best-effort; only enrolls contacts
  // with a phone + SMS consent, so a plain manual add never auto-texts).
  try {
    await enrollByTrigger(createAdminClient(), companyId, "contact_imported", data.id);
  } catch (err) {
    console.error("[contacts] contact_imported enroll failed", err);
  }

  revalidatePath(PATH);
  return { ok: true, contact: data };
}

// Manually enroll a contact into a specific workflow (e.g. from the UI).
export async function enrollContact(contactId: string, workflowId: string): Promise<EnrollResult> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { ok: false, error: "No company is linked to your account." };
  const res = await enrollContactInWorkflow(createAdminClient(), workflowId, contactId);
  revalidatePath(PATH);
  return res;
}

export async function deleteContact(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("review_contacts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

export async function deleteContacts(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const supabase = createClient();
  const { error } = await supabase.from("review_contacts").delete().in("id", ids);
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

// Create a pending review request for a contact and mark them as requested.
export async function sendReviewRequest(id: string): Promise<void> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error("No company is linked to your account.");

  const supabase = createClient();
  const { data: contact } = await supabase
    .from("review_contacts")
    .select("phone, email")
    .eq("id", id)
    .single<{ phone: string | null; email: string | null }>();
  if (!contact) throw new Error("Contact not found.");

  // Pull the company's Google review URL so the tracked link has a destination.
  const { data: settings } = await supabase
    .from("review_settings")
    .select("google_review_url")
    .eq("company_id", companyId)
    .maybeSingle<{ google_review_url: string | null }>();

  const channel = contact.phone ? "sms" : "email";
  const { error: reqError } = await supabase.from("review_requests").insert({
    company_id: companyId,
    contact_id: id,
    channel,
    status: "pending",
    short_code: generateShortCode(),
    review_url: settings?.google_review_url ?? null,
  });
  if (reqError) throw new Error(reqError.message);

  await supabase
    .from("review_contacts")
    .update({ status: "requested", last_requested_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath(PATH);
}
