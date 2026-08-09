import { requireClient } from "@/lib/auth";
import { NotLinked } from "@/components/dashboard/NotLinked";
import { ReputationNav } from "@/components/dashboard/reputation/ReputationNav";
import { ToastProvider } from "@/components/dashboard/reputation/Toast";

// Shared chrome for the Reputation module: a section header + the tab sub-nav,
// then the active page. Client-scoped, matching Leads/Settings.
export default async function ReputationLayout({ children }: { children: React.ReactNode }) {
  const { client } = await requireClient();
  if (!client) return <NotLinked />;

  return (
    <ToastProvider>
      <div className="space-y-6">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#9b9a97]">Reputation</p>
          <ReputationNav />
        </div>
        {children}
      </div>
    </ToastProvider>
  );
}
