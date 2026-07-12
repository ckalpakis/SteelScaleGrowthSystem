import { requireAgencyAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ToastProvider } from "@/components/dashboard/reputation/Toast";
import { DeveloperConsole } from "@/components/dashboard/developer/DeveloperConsole";
import { getDeveloperConsoleData } from "@/app/dashboard/developer/data";

export const dynamic = "force-dynamic";

// Hidden, admin-only developer console. Not linked in the nav — reachable by URL
// (/dashboard/developer). requireAgencyAdmin() redirects non-admins.
export default async function DeveloperConsolePage() {
  await requireAgencyAdmin();

  const data = await getDeveloperConsoleData(createAdminClient());

  return (
    <ToastProvider>
      <div className="rounded-2xl bg-[#0f0f0f] p-5 text-white sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-brand text-xs">{"</>"}</span>
              Developer Console
            </h1>
            <p className="mt-1 text-xs text-[#8a8a8a]">
              Webhooks, API requests, events, workflow runs, retries, and sync history. Admin only.
            </p>
          </div>
          <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold text-red-400">Restricted</span>
        </div>

        <DeveloperConsole data={data} />
      </div>
    </ToastProvider>
  );
}
