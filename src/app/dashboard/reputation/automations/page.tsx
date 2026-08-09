import { createClient } from "@/lib/supabase/server";
import { WorkflowBuilder } from "@/components/dashboard/reputation/automations/WorkflowBuilder";
import { type ReviewWorkflow } from "@/lib/reputation";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const supabase = createClient();

  const [{ data: workflows }, { data: templates }] = await Promise.all([
    supabase.from("review_workflows").select("*").order("created_at", { ascending: false }).returns<ReviewWorkflow[]>(),
    supabase
      .from("review_templates")
      .select("id, name")
      .eq("channel", "sms")
      .order("created_at", { ascending: false })
      .returns<{ id: string; name: string }[]>(),
  ]);

  return <WorkflowBuilder workflows={workflows ?? []} templates={templates ?? []} />;
}
