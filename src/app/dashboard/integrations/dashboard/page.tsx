import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NotLinked } from "@/components/dashboard/NotLinked";
import { ToastProvider } from "@/components/dashboard/reputation/Toast";
import { Panel, StatCard, StatusPill, EmptyState, UsersIcon, ChartIcon, SendIcon, BoltIcon } from "@/components/dashboard/reputation/ui";
import { IntegrationLogo } from "@/components/dashboard/integrations/IntegrationLogo";
import { SyncNowButton } from "@/components/dashboard/integrations/SyncNowButton";
import { getIntegrationDashboard, type DashboardCard, type RecentEvent } from "@/app/dashboard/integrations/dashboard/data";
import { timeAgo } from "@/lib/integrations";

export const dynamic = "force-dynamic";

const API_TONE = { operational: "green", error: "red", disconnected: "gray" } as const;
const API_LABEL = { operational: "API operational", error: "API error", disconnected: "API offline" } as const;
const HOOK_TONE = { active: "green", error: "red", none: "gray" } as const;
const HOOK_LABEL = { active: "Webhook active", error: "Webhook error", none: "No webhook" } as const;
const EVENT_TONE: Record<string, "green" | "blue" | "amber" | "red" | "gray"> = {
  processed: "green",
  received: "blue",
  failed: "red",
  ignored: "gray",
};

export default async function IntegrationDashboardPage() {
  const { client } = await requireClient();
  if (!client) return <NotLinked />;

  const supabase = createClient();
  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle<{ id: string }>();
  const data = company
    ? await getIntegrationDashboard(supabase, createAdminClient(), company.id)
    : { cards: [], recentEvents: [] };

  return (
    <ToastProvider>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#37352f]">Integration Dashboard</h1>
            <p className="mt-1 text-sm text-[#787774]">Sync status, health, and recent activity for your connected tools.</p>
          </div>
          <Link
            href="/dashboard/integrations"
            className="rounded-md border border-[#e0e0de] bg-white px-3.5 py-2 text-sm font-medium text-[#37352f] transition-colors hover:bg-[#f7f7f5]"
          >
            Browse integrations
          </Link>
        </div>

        {data.cards.length === 0 ? (
          <EmptyState
            icon={<BoltIcon className="h-5 w-5" />}
            title="No connected CRM yet"
            description="Connect a CRM from the integrations marketplace to start syncing customers and jobs."
            action={
              <Link href="/dashboard/integrations" className="rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-dark">
                Browse integrations
              </Link>
            }
          />
        ) : (
          data.cards.map((card) => <IntegrationHealth key={card.provider} card={card} />)
        )}

        {/* Recent events */}
        <Panel title="Recent events">
          {data.recentEvents.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#9b9a97]">No events yet. They’ll appear here as your CRM sends activity.</p>
          ) : (
            <ul className="divide-y divide-[#f0f0ef]">
              {data.recentEvents.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </ToastProvider>
  );
}

function IntegrationHealth({ card }: { card: DashboardCard }) {
  return (
    <Panel className="!p-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0f0ef] px-5 py-4">
        <div className="flex items-center gap-3">
          <IntegrationLogo color={card.color} monogram={card.monogram} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#37352f]">{card.name}</span>
              <StatusPill tone="green">Connected</StatusPill>
            </div>
            <div className="mt-0.5 text-xs text-[#9b9a97]">{card.connectedAccount ?? "—"}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={API_TONE[card.apiStatus]}>{API_LABEL[card.apiStatus]}</StatusPill>
          <StatusPill tone={HOOK_TONE[card.webhookStatus]}>{HOOK_LABEL[card.webhookStatus]}</StatusPill>
          <SyncNowButton provider={card.provider} name={card.name} />
        </div>
      </div>

      {/* Active sync progress */}
      {card.activeJob && (
        <div className="border-b border-[#f0f0ef] px-5 py-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-[#37352f]">
              Syncing {card.activeJob.jobType.replace("import_", "").replace("_", " ")}…
            </span>
            <span className="capitalize text-[#9b9a97]">{card.activeJob.status}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#ececeb]">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-brand" />
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Last Sync" value={timeAgo(card.lastSyncAt)} icon={<RefreshMini />} />
        <StatCard label="Customers Synced" value={String(card.customersSynced)} icon={<UsersIcon className="h-4 w-4" />} />
        <StatCard label="Jobs Synced" value={String(card.jobsSynced)} icon={<SendIcon className="h-4 w-4" />} />
        <StatCard
          label="Errors"
          value={String(card.errors)}
          icon={<ChartIcon className="h-4 w-4" />}
          trend={card.errors > 0 ? "Needs attention" : "All clear"}
          trendUp={card.errors === 0}
        />
      </div>
    </Panel>
  );
}

function EventRow({ event }: { event: RecentEvent }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <BoltIcon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-[#37352f]">{event.eventType}</span>
        <span className="ml-2 text-xs text-[#9b9a97]">{event.provider}</span>
      </div>
      <StatusPill tone={EVENT_TONE[event.status] ?? "gray"}>{event.status}</StatusPill>
      <span className="w-16 shrink-0 text-right text-xs text-[#9b9a97]">{timeAgo(event.at)}</span>
    </li>
  );
}

function RefreshMini() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M20 11a8 8 0 0 0-14-4.9L4 8m0 0V4m0 4h4M4 13a8 8 0 0 0 14 4.9l2-1.9m0 0v4m0-4h-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
