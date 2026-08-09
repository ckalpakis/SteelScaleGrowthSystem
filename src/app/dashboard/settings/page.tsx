import { requireClient } from "@/lib/auth";
import { NotLinked } from "@/components/dashboard/NotLinked";
import { SettingsForm } from "@/components/dashboard/SettingsForm";
import { updateSettings } from "@/app/dashboard/actions";
import { hasReviewAutomation } from "@/lib/types";

export default async function SettingsPage() {
  const { client, settings } = await requireClient();
  if (!client) return <NotLinked />;

  return (
    <SettingsForm
      settings={settings}
      clientName={client.name}
      action={updateSettings}
      reviewAutomation={hasReviewAutomation(client)}
    />
  );
}
