import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAgencyAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardBody, Input, Label, Button } from "@/components/ui";
import { SettingsForm } from "@/components/dashboard/SettingsForm";
import { AddLoginForm } from "@/components/dashboard/AddLoginForm";
import { updateClientSettings, updateClientCore } from "@/app/dashboard/clients/actions";
import type { Client, ClientSettings } from "@/lib/types";
import { TIER_LABELS, hasReviewAutomation } from "@/lib/types";

export default async function ClientEditPage({ params }: { params: { id: string } }) {
  await requireAgencyAdmin();
  const admin = createAdminClient();

  const { data: client } = await admin.from("clients").select("*").eq("id", params.id).single<Client>();
  if (!client) notFound();

  const { data: settings } = await admin
    .from("client_settings")
    .select("*")
    .eq("client_id", client.id)
    .maybeSingle<ClientSettings>();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, role")
    .eq("client_id", client.id)
    .returns<{ id: string; role: string }[]>();

  const logins: { email: string; role: string }[] = [];
  for (const p of profiles ?? []) {
    const { data } = await admin.auth.admin.getUserById(p.id);
    if (data.user?.email) logins.push({ email: data.user.email, role: p.role });
  }

  const settingsAction = updateClientSettings.bind(null, client.id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/clients" className="text-sm text-gray-500 hover:text-gray-700">← Back to clients</Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-[#37352f]">{client.name}</h1>
          <div className="flex gap-3 text-sm">
            <Link href={`/site/${client.slug}`} target="_blank" className="text-gray-500 hover:text-brand">View site ↗</Link>
          </div>
        </div>
      </div>

      {/* Core: slug + domain */}
      <Card>
        <CardBody>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Plan, URL &amp; domain</h2>
          <form action={updateClientCore} className="space-y-4">
            <input type="hidden" name="client_id" value={client.id} />
            <div>
              <Label htmlFor="tier">Plan tier (agency only)</Label>
              <select
                id="tier"
                name="tier"
                defaultValue={String(client.tier)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                {[1, 2, 3].map((t) => (
                  <option key={t} value={t}>{TIER_LABELS[t]}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Tier 2 (Growth) and Tier 3 (Pro) unlock automated email &amp; text review requests. Tier 1 does not.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" name="slug" defaultValue={client.slug} />
                <p className="mt-1 text-xs text-gray-400">Changing this changes their URL.</p>
              </div>
              <div>
                <Label htmlFor="domain">Custom domain</Label>
                <Input id="domain" name="domain" defaultValue={client.domain ?? ""} placeholder="threeriversroofing.com" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="secondary">Save plan &amp; domain</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Logins */}
      <Card>
        <CardBody>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Client logins</h2>
          {logins.length > 0 ? (
            <ul className="mb-5 space-y-1 text-sm text-gray-700">
              {logins.map((l) => (
                <li key={l.email} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <span>{l.email}</span>
                  <span className="text-xs uppercase text-gray-400">{l.role}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-5 text-sm text-gray-500">No login yet — create one so the client can sign in.</p>
          )}
          <AddLoginForm clientId={client.id} />
        </CardBody>
      </Card>

      {/* Full website content editor */}
      <div className="border-t border-gray-200 pt-6">
        <SettingsForm settings={settings} clientName={client.name} action={settingsAction} clientId={client.id} reviewAutomation={hasReviewAutomation(client)} />
      </div>
    </div>
  );
}
