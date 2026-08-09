import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NotLinked } from "@/components/dashboard/NotLinked";
import { ToastProvider } from "@/components/dashboard/reputation/Toast";
import { IntegrationsMarketplace } from "@/components/dashboard/integrations/IntegrationsMarketplace";
import { type IntegrationConnection } from "@/lib/integrations";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const { client } = await requireClient();
  if (!client) return <NotLinked />;

  const supabase = createClient();
  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle<{ id: string }>();

  let connections: IntegrationConnection[] = [];
  if (company) {
    const { data } = await supabase
      .from("integration_connections")
      .select("provider, status, connected_account, config, last_sync_at, connected_at")
      .eq("company_id", company.id)
      .returns<IntegrationConnection[]>();
    connections = data ?? [];
  }

  return (
    <ToastProvider>
      <div>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#37352f]">Integrations</h1>
            <p className="mt-1 text-sm text-[#787774]">
              Connect Steel Scale to the tools you already use. Sync jobs, customers, and reviews automatically.
            </p>
          </div>
          <a
            href="/dashboard/integrations/dashboard"
            className="rounded-md border border-[#e0e0de] bg-white px-3.5 py-2 text-sm font-medium text-[#37352f] transition-colors hover:bg-[#f7f7f5]"
          >
            Sync dashboard
          </a>
        </div>
        <IntegrationsMarketplace connections={connections} />
      </div>
    </ToastProvider>
  );
}
