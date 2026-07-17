"use server";

import { revalidatePath } from "next/cache";

import { requireAgencyAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createInvitation, revokeInvitation } from "@/lib/onboarding/invitations";

export type CreateInvitationState =
  | { ok: true; link: string; email: string | null }
  | { ok: false; error: string }
  | { ok: null };

// Create an invitation and return the raw link ONCE (never stored, never
// retrievable again). Admin-only.
export async function createInvitationAction(
  _prev: CreateInvitationState,
  formData: FormData,
): Promise<CreateInvitationState> {
  const { userId } = await requireAgencyAdmin();

  const rawEmail = String(formData.get("client_email") ?? "").trim();
  if (rawEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    return { ok: false, error: "Enter a valid email address, or leave it blank." };
  }

  try {
    const admin = createAdminClient();
    const { rawToken } = await createInvitation(admin, {
      clientEmail: rawEmail || null,
      createdByUserId: userId,
    });

    const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const link = `${base}/onboard/${rawToken}`;

    revalidatePath("/dashboard/onboarding");
    return { ok: true, link, email: rawEmail || null };
  } catch (err) {
    console.error("[onboarding] create invitation failed", err);
    return { ok: false, error: "Could not create the invitation. Please try again." };
  }
}

export async function revokeInvitationAction(invitationId: string): Promise<void> {
  await requireAgencyAdmin();
  const admin = createAdminClient();
  await revokeInvitation(admin, invitationId);
  revalidatePath("/dashboard/onboarding");
}
