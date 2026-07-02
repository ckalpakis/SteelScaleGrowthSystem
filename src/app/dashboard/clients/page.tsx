import Link from "next/link";
import { requireAgencyAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui";

export default async function ClientsPage() {
  await requireAgencyAdmin();
  const admin = createAdminClient();

  const { data: clients } = await admin
    .from("clients")
    .select("id, name, slug, domain, tier, created_at")
    .order("created_at", { ascending: false })
    .returns<{ id: string; name: string; slug: string; domain: string | null; tier: number; created_at: string }[]>();

  const { data: leads } = await admin.from("leads").select("client_id").returns<{ client_id: string }[]>();
  const leadCounts: Record<string, number> = {};
  for (const l of leads ?? []) leadCounts[l.client_id] = (leadCounts[l.client_id] ?? 0) + 1;

  const rows = clients ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500">{rows.length} total</p>
        </div>
        <Link
          href="/dashboard/clients/new"
          className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          + New client
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card>
          <div className="p-10 text-center text-sm text-gray-500">
            No clients yet.{" "}
            <Link href="/dashboard/clients/new" className="font-medium text-brand underline">
              Create your first one
            </Link>
            .
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Business</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">URL</th>
                <th className="px-5 py-3 font-medium">Leads</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/clients/${c.id}`} className="font-medium text-gray-900 hover:text-brand">
                        {c.name}
                      </Link>
                      <span
                        className={
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold " +
                          (c.tier >= 3
                            ? "bg-purple-100 text-purple-700"
                            : c.tier === 2
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600")
                        }
                        title={c.tier >= 2 ? "Automated review requests enabled" : "No automated review requests"}
                      >
                        Tier {c.tier}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">/{c.slug}</div>
                  </td>
                  <td className="hidden px-5 py-3 text-gray-500 sm:table-cell">{c.domain ?? `…/site/${c.slug}`}</td>
                  <td className="px-5 py-3 text-gray-600">{leadCounts[c.id] ?? 0}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-3 text-sm">
                      <Link href={`/site/${c.slug}`} target="_blank" className="text-gray-500 hover:text-brand">View site ↗</Link>
                      <Link href={`/dashboard/clients/${c.id}`} className="font-medium text-brand hover:underline">Edit</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
