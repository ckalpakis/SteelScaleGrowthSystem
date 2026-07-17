import Link from "next/link";

import { requireAgencyAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOnboardingOverview } from "@/lib/onboarding/admin.server";
import { ClientStatusBadge } from "@/components/dashboard/onboarding/StatusBadge";
import type { ClientAccount } from "@/lib/onboarding/types";

export const dynamic = "force-dynamic";

// Admin-only onboarding overview: status counts + recent clients.
export default async function OnboardingOverviewPage() {
  await requireAgencyAdmin();
  const admin = createAdminClient();

  const [counts, clientsRes] = await Promise.all([
    getOnboardingOverview(admin),
    admin.from("client_accounts").select("id, public_business_name, status, created_at").order("created_at", { ascending: false }).limit(50).returns<Pick<ClientAccount, "id" | "public_business_name" | "status" | "created_at">[]>(),
  ]);
  const clients = clientsRes.data ?? [];

  const tiles = [
    { label: "Pending invitations", value: counts.pendingInvitations, tone: "neutral" as const },
    { label: "Submitted", value: counts.submitted, tone: "neutral" as const },
    { label: "Provisioning", value: counts.provisioning, tone: "neutral" as const },
    { label: "Needs action", value: counts.needsAction, tone: "yellow" as const },
    { label: "Active", value: counts.active, tone: "green" as const },
    { label: "Failed", value: counts.failed, tone: "red" as const },
  ];

  const toneCls: Record<string, string> = {
    neutral: "border-[#ededec] bg-white",
    yellow: "border-amber-200 bg-amber-50",
    green: "border-green-200 bg-green-50",
    red: "border-red-200 bg-red-50",
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#37352f]">Onboarding</h1>
          <p className="mt-1 text-sm text-[#5f5e5b]">Client setup and provisioning status.</p>
        </div>
        <Link href="/dashboard/onboarding/invitations" className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          Manage invitations
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className={`rounded-xl border p-4 ${toneCls[t.tone]}`}>
            <div className="text-2xl font-bold text-[#37352f]">{t.value}</div>
            <div className="mt-1 text-xs text-[#5f5e5b]">{t.label}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#91918e]">Clients</h2>
        {clients.length === 0 ? (
          <div className="rounded-xl border border-[#ededec] bg-white p-6 text-center text-sm text-[#91918e]">No client accounts yet.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#ededec] bg-white">
            <div className="divide-y divide-[#f1f1ef]">
              {clients.map((c) => (
                <Link key={c.id} href={`/dashboard/onboarding/clients/${c.id}`} className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-[#f7f7f5]">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[#37352f]">{c.public_business_name}</div>
                    <div className="mt-0.5 text-xs text-[#91918e]">Started {new Date(c.created_at).toLocaleDateString()}</div>
                  </div>
                  <ClientStatusBadge status={c.status} />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
