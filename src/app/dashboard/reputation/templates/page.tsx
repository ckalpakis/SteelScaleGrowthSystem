import { createClient } from "@/lib/supabase/server";
import { TemplatesManager } from "@/components/dashboard/reputation/templates/TemplatesManager";
import { type ReviewTemplate } from "@/lib/reputation";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("review_templates")
    .select("*")
    .eq("channel", "sms")
    .order("created_at", { ascending: false })
    .returns<ReviewTemplate[]>();

  return <TemplatesManager templates={data ?? []} />;
}
