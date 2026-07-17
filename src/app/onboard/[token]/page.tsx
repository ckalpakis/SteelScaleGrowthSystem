import type { Metadata } from "next";

import { createAdminClient } from "@/lib/supabase/admin";
import { markInvitationOpened, resolveInvitation } from "@/lib/onboarding/invitations";
import { checkRateLimit, OPEN_RATE } from "@/lib/onboarding/rateLimit";
import { headers } from "next/headers";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { OnboardingShell, OnboardingNotice } from "@/components/onboarding/OnboardingShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business setup — Steel Scale",
  robots: { index: false, follow: false },
};

// Public, token-gated onboarding page. No login required. Renders the multi-step
// "Business setup" form for a valid invitation; every invalid state (missing,
// expired, revoked, or already completed) shows the SAME generic notice so a
// guessed link never reveals whether a token existed.
export default async function OnboardPage({ params }: { params: { token: string } }) {
  const ip = clientIp();
  const gate = checkRateLimit(`open:${ip}`, OPEN_RATE.max, OPEN_RATE.windowMs);
  if (!gate.ok) {
    return (
      <OnboardingShell>
        <OnboardingNotice
          title="Please slow down"
          body="Too many requests from your connection. Please wait a moment and refresh the page."
        />
      </OnboardingShell>
    );
  }

  const admin = createAdminClient();
  const resolved = await resolveInvitation(admin, params.token);

  if (resolved.reason !== "valid") {
    return (
      <OnboardingShell>
        <OnboardingNotice
          title="This link is no longer available"
          body="This setup link is invalid or has already been used. If you think this is a mistake, please contact our team and we'll send you a new one."
        />
      </OnboardingShell>
    );
  }

  // Mark opened on first access (idempotent).
  await markInvitationOpened(admin, resolved.invitation.id);

  return (
    <OnboardingShell>
      <OnboardingForm token={params.token} defaultEmail={resolved.invitation.client_email ?? ""} />
    </OnboardingShell>
  );
}

function clientIp(): string {
  const h = headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}
