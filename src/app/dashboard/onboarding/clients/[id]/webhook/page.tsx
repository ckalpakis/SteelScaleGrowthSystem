import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAgencyAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientDetail } from "@/lib/onboarding/admin.server";
import { buildSetupInstructions, buildWorkflowPayloads, workflowWebhookUrl, WEBHOOK_SECRET_HEADER, WEBHOOK_HTTP_METHOD, WEBHOOK_CONTENT_TYPE } from "@/lib/onboarding/webhook-setup";
import { WebhookSetupView } from "@/components/dashboard/onboarding/WebhookSetupView";

export const dynamic = "force-dynamic";

export default async function WebhookSetupPage({ params }: { params: { id: string } }) {
  await requireAgencyAdmin();
  const detail = await getClientDetail(createAdminClient(), params.id);
  if (!detail) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div>
      <Link href={`/dashboard/onboarding/clients/${params.id}`} className="text-sm text-[#91918e] hover:text-[#5f5e5b]">← {detail.client.public_business_name}</Link>
      <WebhookSetupView
        clientId={detail.client.id}
        businessName={detail.client.public_business_name}
        locationId={detail.location?.ghl_location_id ?? null}
        webhookConfigured={Boolean(detail.webhook?.enabled)}
        webhookPublicId={detail.webhook?.publicId ?? null}
        webhookUrl={workflowWebhookUrl(appUrl)}
        secretHeader={WEBHOOK_SECRET_HEADER}
        method={WEBHOOK_HTTP_METHOD}
        contentType={WEBHOOK_CONTENT_TYPE}
        payloads={buildWorkflowPayloads()}
        instructions={buildSetupInstructions()}
      />
    </div>
  );
}
