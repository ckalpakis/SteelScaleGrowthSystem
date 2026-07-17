import { requireAgencyAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { listInvitations } from "@/lib/onboarding/invitations";
import { OnboardingAdmin } from "@/components/dashboard/onboarding/OnboardingAdmin";

export const dynamic = "force-dynamic";

// Admin-only: create and manage client onboarding invitations.
export default async function OnboardingAdminPage() {
  await requireAgencyAdmin();

  const admin = createAdminClient();
  const invitations = await listInvitations(admin);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#37352f]">Client onboarding</h1>
        <p className="mt-1 text-sm text-[#5f5e5b]">
          Invite a client to complete their business setup. The link is shown once when you create it — copy it right
          away.
        </p>
      </div>
      <OnboardingAdmin invitations={invitations.map(toView)} />
    </div>
  );
}

function toView(i: {
  id: string;
  client_email: string | null;
  status: string;
  expires_at: string;
  created_at: string;
  opened_at: string | null;
  submitted_at: string | null;
}) {
  return {
    id: i.id,
    email: i.client_email,
    status: i.status,
    expiresAt: i.expires_at,
    createdAt: i.created_at,
    openedAt: i.opened_at,
    submittedAt: i.submitted_at,
  };
}
