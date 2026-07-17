import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAgencyAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientDetail } from "@/lib/onboarding/admin.server";
import { ClientDetailView } from "@/components/dashboard/onboarding/ClientDetailView";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  await requireAgencyAdmin();
  const detail = await getClientDetail(createAdminClient(), params.id);
  if (!detail) notFound();

  return (
    <div>
      <Link href="/dashboard/onboarding" className="text-sm text-[#91918e] hover:text-[#5f5e5b]">← Onboarding</Link>
      <ClientDetailView detail={JSON.parse(JSON.stringify(detail))} />
    </div>
  );
}
