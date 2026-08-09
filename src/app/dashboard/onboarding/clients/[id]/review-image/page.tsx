import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAgencyAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientDetail } from "@/lib/onboarding/admin.server";
import { getReviewImageConfig } from "@/lib/review-image/config.server";
import { buildReviewImageUrl, reviewImageSigningConfigured } from "@/lib/review-image/sign";
import { ReviewImageForm } from "@/components/dashboard/onboarding/ReviewImageForm";

export const dynamic = "force-dynamic";

// Admin-only: configure the personalized MMS image for a client's first two texts.
export default async function ReviewImagePage({ params }: { params: { id: string } }) {
  await requireAgencyAdmin();
  const admin = createAdminClient();

  const detail = await getClientDetail(admin, params.id);
  if (!detail) notFound();

  const config = await getReviewImageConfig(admin, params.id);

  // A signed preview URL (sample name) for the live preview — only when possible.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const previewUrl =
    appUrl && reviewImageSigningConfigured() && config?.enabled && config?.baseImageUrl
      ? buildReviewImageUrl(appUrl, params.id, "Jordan")
      : null;

  return (
    <div>
      <Link href={`/dashboard/onboarding/clients/${params.id}`} className="text-sm text-[#5f5e5b] hover:text-[#37352f]">
        ← Back to {detail.client.public_business_name}
      </Link>
      <div className="mb-6 mt-3">
        <h1 className="text-2xl font-bold text-[#37352f]">Personalized image</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#5f5e5b]">
          Attach a personalized image (a base photo — e.g. the team — with the customer&apos;s name overlaid) to the first two
          review‑request texts. Sent as MMS through your Twilio; the name changes for each recipient automatically.
        </p>
      </div>

      {!reviewImageSigningConfigured() && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Set <code>CREDENTIALS_ENCRYPTION_KEY</code> (or <code>REVIEW_IMAGE_SIGNING_SECRET</code>) so images can be signed.
        </div>
      )}

      <ReviewImageForm
        clientId={params.id}
        initial={{
          enabled: config?.enabled ?? false,
          baseImageUrl: config?.baseImageUrl ?? null,
          nameTemplate: config?.nameTemplate ?? "{name}",
          textColor: config?.textColor ?? "#FFFFFF",
          fontSize: config?.fontSize ?? 72,
          textPosition: config?.textPosition ?? "bottom",
        }}
        previewUrl={previewUrl}
      />
    </div>
  );
}
