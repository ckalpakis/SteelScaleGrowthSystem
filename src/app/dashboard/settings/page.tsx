import { requireClient } from "@/lib/auth";
import { NotLinked } from "@/components/dashboard/NotLinked";
import { SettingsForm } from "@/components/dashboard/SettingsForm";

export default async function SettingsPage() {
  const { client, settings } = await requireClient();
  if (!client) return <NotLinked />;

  return <SettingsForm settings={settings} clientName={client.name} />;
}
