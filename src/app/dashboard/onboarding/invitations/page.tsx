import Link from "next/link";

import { requireAgencyAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { listInvitations } from "@/lib/onboarding/invitations";
import { OnboardingAdmin } from "@/components/dashboard/onboarding/OnboardingAdmin";

export const dynamic = "force-dynamic";

// Admin-only: create and manage client onboarding invitations.
export default async function InvitationsPage() {
  await requireAgencyAdmin();
  const admin = createAdminClient();
  const invitations = await listInvitations(admin);

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/onboarding" className="text-sm text-[#91918e] hover:text-[#5f5e5b]">← Onboarding</Link>
        <h1 className="mt-2 text-2xl font-bold text-[#37352f]">Invitations</h1>
        <p className="mt-1 text-sm text-[#5f5e5b]">
          Invite a client to complete their business setup. The link is shown once when you create it — copy it right
          away.
        </p>
      </div>
      <OnboardingAdmin
        invitations={invitations.map((i) => ({
          id: i.id,
          email: i.client_email,
          status: i.status,
          expiresAt: i.expires_at,
          createdAt: i.created_at,
          openedAt: i.opened_at,
          submittedAt: i.submitted_at,
        }))}
      />
    </div>
  );
}
