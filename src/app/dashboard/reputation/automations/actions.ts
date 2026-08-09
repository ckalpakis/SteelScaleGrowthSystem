"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/reputation.server";
import {
  WORKFLOW_TRIGGERS,
  WORKFLOW_STOP_CONDITIONS,
  type ReviewWorkflow,
  type WorkflowTrigger,
  type StopCondition,
} from "@/lib/reputation";

const PATH = "/dashboard/reputation/automations";

export type WorkflowResult = { ok: true; workflow: ReviewWorkflow } | { ok: false; error: string };

export interface WorkflowInput {
  name: string;
  trigger_type: WorkflowTrigger;
  template_id: string | null;
  delay_minutes: number;
  reminder_count: number;
  reminder_delay_minutes: number;
  stop_conditions: StopCondition[];
  is_active: boolean;
}

const VALID_TRIGGERS = new Set(WORKFLOW_TRIGGERS.map((t) => t.value));
const VALID_STOPS = new Set(WORKFLOW_STOP_CONDITIONS.map((s) => s.value));

// Normalize + validate raw input into a DB-ready payload.
function normalize(input: WorkflowInput): { payload: Omit<WorkflowInput, "name"> & { name: string }; error?: string } {
  const name = (input.name ?? "").trim();
  if (!name) return { payload: input as never, error: "Give your workflow a name." };
  if (!VALID_TRIGGERS.has(input.trigger_type)) return { payload: input as never, error: "Pick a valid trigger." };

  const stops = (input.stop_conditions ?? []).filter((s) => VALID_STOPS.has(s));
  const clamp = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

  return {
    payload: {
      name,
      trigger_type: input.trigger_type,
      template_id: input.template_id || null,
      delay_minutes: clamp(input.delay_minutes),
      reminder_count: Math.min(clamp(input.reminder_count), 5),
      reminder_delay_minutes: clamp(input.reminder_delay_minutes),
      stop_conditions: stops,
      is_active: !!input.is_active,
    },
  };
}

export async function createWorkflow(input: WorkflowInput): Promise<WorkflowResult> {
  const { payload, error } = normalize(input);
  if (error) return { ok: false, error };

  const companyId = await getCurrentCompanyId();
  if (!companyId) return { ok: false, error: "No company is linked to your account." };

  const supabase = createClient();
  const { data, error: dbError } = await supabase
    .from("review_workflows")
    .insert({ company_id: companyId, channel: "sms", ...payload })
    .select("*")
    .single<ReviewWorkflow>();

  if (dbError || !data) return { ok: false, error: dbError?.message ?? "Could not create the workflow." };
  revalidatePath(PATH);
  return { ok: true, workflow: data };
}

export async function updateWorkflow(id: string, input: WorkflowInput): Promise<WorkflowResult> {
  const { payload, error } = normalize(input);
  if (error) return { ok: false, error };

  const supabase = createClient();
  const { data, error: dbError } = await supabase
    .from("review_workflows")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single<ReviewWorkflow>();

  if (dbError || !data) return { ok: false, error: dbError?.message ?? "Could not save the workflow." };
  revalidatePath(PATH);
  return { ok: true, workflow: data };
}

export async function toggleWorkflow(id: string, isActive: boolean): Promise<WorkflowResult> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("review_workflows")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("*")
    .single<ReviewWorkflow>();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not update the workflow." };
  revalidatePath(PATH);
  return { ok: true, workflow: data };
}

export async function deleteWorkflow(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("review_workflows").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}
