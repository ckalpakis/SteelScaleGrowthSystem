"use client";

import { useMemo, useState } from "react";
import { Button, Input, Label, cn } from "@/components/ui";
import { Modal } from "@/components/dashboard/reputation/Modal";
import { ConfirmDialog, useConfirm } from "@/components/dashboard/reputation/ConfirmDialog";
import { useToast } from "@/components/dashboard/reputation/Toast";
import { IntegrationLogo } from "@/components/dashboard/integrations/IntegrationLogo";
import {
  INTEGRATION_CATALOG,
  INTEGRATION_CATEGORIES,
  STATUS_META,
  timeAgo,
  type IntegrationConnection,
  type IntegrationDef,
} from "@/lib/integrations";
import {
  connectIntegration,
  disconnectIntegration,
  saveIntegrationSettings,
} from "@/app/dashboard/integrations/actions";

// Providers that connect via a real OAuth redirect instead of the stub action.
const OAUTH_CONNECT: Record<string, string> = {
  google_business: "/api/integrations/google/connect",
};

const DISCONNECTED: IntegrationConnection = {
  provider: "",
  status: "disconnected",
  connected_account: null,
  config: {},
  last_sync_at: null,
  connected_at: null,
};

export function IntegrationsMarketplace({ connections }: { connections: IntegrationConnection[] }) {
  const { toast } = useToast();
  const [state, setState] = useState<Record<string, IntegrationConnection>>(() =>
    Object.fromEntries(connections.map((c) => [c.provider, c]))
  );
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [busy, setBusy] = useState<string | null>(null);
  const [settingsFor, setSettingsFor] = useState<IntegrationDef | null>(null);
  const confirmDisconnect = useConfirm<string>();

  const connectionOf = (provider: string): IntegrationConnection => state[provider] ?? { ...DISCONNECTED, provider };
  const connectedCount = Object.values(state).filter((c) => c.status === "connected").length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return INTEGRATION_CATALOG.filter((def) => {
      if (category !== "All" && def.category !== category) return false;
      if (!q) return true;
      return def.name.toLowerCase().includes(q) || def.description.toLowerCase().includes(q);
    });
  }, [search, category]);

  async function connect(def: IntegrationDef) {
    setBusy(def.provider);
    const res = await connectIntegration(def.provider);
    setBusy(null);
    if (!res.ok) {
      toast({ title: `Couldn't connect ${def.name}`, description: res.error, variant: "error" });
      return;
    }
    setState((s) => ({ ...s, [def.provider]: res.connection }));
    toast({ title: `${def.name} connected`, variant: "success" });
  }

  async function disconnect(provider: string) {
    const def = INTEGRATION_CATALOG.find((d) => d.provider === provider);
    setBusy(provider);
    const res = await disconnectIntegration(provider);
    setBusy(null);
    if (!res.ok) {
      toast({ title: "Couldn't disconnect", description: res.error, variant: "error" });
      return;
    }
    setState((s) => ({ ...s, [provider]: res.connection }));
    toast({ title: `${def?.name ?? "Integration"} disconnected`, variant: "success" });
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9b9a97]">
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search integrations…"
            className="w-full rounded-md border border-[#e0e0de] bg-white py-2 pl-9 pr-3 text-sm text-[#37352f] placeholder-[#b9b9b7] focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15"
          />
        </div>
        <span className="text-sm text-[#787774]">
          <span className="font-semibold text-[#37352f]">{connectedCount}</span> of {INTEGRATION_CATALOG.length} connected
        </span>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5">
        {["All", ...INTEGRATION_CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              category === c
                ? "border-brand/40 bg-brand/[0.06] text-brand"
                : "border-[#e0e0de] bg-white text-[#787774] hover:bg-[#fafafa]"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#e0e0de] bg-[#fafafa] px-6 py-16 text-center text-sm text-[#787774]">
          No integrations match your search.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((def) => (
            <IntegrationCard
              key={def.provider}
              def={def}
              connection={connectionOf(def.provider)}
              busy={busy === def.provider}
              connectHref={OAUTH_CONNECT[def.provider]}
              onConnect={() => connect(def)}
              onDisconnect={() => confirmDisconnect.ask(def.provider)}
              onSettings={() => setSettingsFor(def)}
            />
          ))}
        </div>
      )}

      {settingsFor && (
        <SettingsModal
          def={settingsFor}
          connection={connectionOf(settingsFor.provider)}
          onClose={() => setSettingsFor(null)}
          onSaved={(conn) => {
            setState((s) => ({ ...s, [conn.provider]: conn }));
            toast({ title: "Settings saved", variant: "success" });
            setSettingsFor(null);
          }}
        />
      )}

      <ConfirmDialog
        open={confirmDisconnect.open}
        onClose={confirmDisconnect.close}
        onConfirm={() => {
          if (confirmDisconnect.target) return disconnect(confirmDisconnect.target);
        }}
        title="Disconnect integration?"
        description="This will stop syncing and remove the connection. You can reconnect anytime."
        confirmLabel="Disconnect"
        destructive
      />
    </div>
  );
}

// ---------------------------------------------------------------- card
function IntegrationCard({
  def,
  connection,
  busy,
  connectHref,
  onConnect,
  onDisconnect,
  onSettings,
}: {
  def: IntegrationDef;
  connection: IntegrationConnection;
  busy: boolean;
  connectHref?: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onSettings: () => void;
}) {
  const connected = connection.status === "connected";
  const meta = STATUS_META[connection.status];

  return (
    <div className="group flex flex-col rounded-xl border border-[#ededec] bg-white p-5 shadow-[0_1px_2px_rgba(15,15,15,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-14px_rgba(15,15,15,0.22)]">
      <div className="flex items-start justify-between gap-3">
        <IntegrationLogo color={def.color} monogram={def.monogram} />
        <StatusChip tone={meta.tone}>{meta.label}</StatusChip>
      </div>

      <h3 className="mt-4 font-semibold text-[#37352f]">{def.name}</h3>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-[#787774]">{def.description}</p>

      {/* Connected meta */}
      {connected && (
        <dl className="mt-4 space-y-1.5 rounded-lg bg-[#fafafa] p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-[#9b9a97]">{def.accountLabel}</dt>
            <dd className="truncate font-medium text-[#37352f]">{connection.connected_account ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-[#9b9a97]">Last sync</dt>
            <dd className="font-medium text-[#37352f]">{timeAgo(connection.last_sync_at)}</dd>
          </div>
        </dl>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-[#f0f0ef] pt-4">
        {connected ? (
          <>
            <Button variant="secondary" className="flex-1 text-sm" onClick={onSettings}>
              Settings
            </Button>
            <Button variant="ghost" className="text-sm !text-red-600" disabled={busy} onClick={onDisconnect}>
              {busy ? "…" : "Disconnect"}
            </Button>
          </>
        ) : connectHref ? (
          <>
            <a
              href={connectHref}
              className="inline-flex flex-1 items-center justify-center rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
            >
              Connect
            </a>
            <Button variant="secondary" className="text-sm" onClick={onSettings} aria-label={`${def.name} settings`}>
              Settings
            </Button>
          </>
        ) : (
          <>
            <Button className="flex-1 text-sm" disabled={busy} onClick={onConnect}>
              {busy ? "Connecting…" : "Connect"}
            </Button>
            <Button variant="secondary" className="text-sm" onClick={onSettings} aria-label={`${def.name} settings`}>
              Settings
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- settings modal
function SettingsModal({
  def,
  connection,
  onClose,
  onSaved,
}: {
  def: IntegrationDef;
  connection: IntegrationConnection;
  onClose: () => void;
  onSaved: (conn: IntegrationConnection) => void;
}) {
  const { toast } = useToast();
  const isWebhooks = def.provider === "webhooks";
  const [account, setAccount] = useState(connection.connected_account ?? "");
  const [webhookUrl, setWebhookUrl] = useState((connection.config?.webhook_url as string) ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await saveIntegrationSettings(def.provider, {
      connected_account: isWebhooks ? webhookUrl : account,
      config: isWebhooks ? { ...connection.config, webhook_url: webhookUrl } : connection.config,
    });
    setSaving(false);
    if (!res.ok) {
      toast({ title: "Couldn't save", description: res.error, variant: "error" });
      return;
    }
    onSaved(res.connection);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${def.name} settings`}
      description={def.category}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {isWebhooks ? (
          <div>
            <Label htmlFor="webhook_url">Endpoint URL</Label>
            <Input
              id="webhook_url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://example.com/webhooks/steelscale"
            />
            <p className="mt-1.5 text-xs text-[#9b9a97]">Events will POST here once event delivery is enabled.</p>
          </div>
        ) : (
          <div>
            <Label htmlFor="account">{def.accountLabel} name</Label>
            <Input
              id="account"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder={`Your ${def.name} ${def.accountLabel.toLowerCase()}`}
            />
            <p className="mt-1.5 text-xs text-[#9b9a97]">
              Shown on the integration card. Real authentication comes later.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- bits
function StatusChip({ tone, children }: { tone: "green" | "gray" | "amber" | "red"; children: React.ReactNode }) {
  const tones = {
    green: "bg-green-50 text-green-700 ring-green-600/10",
    gray: "bg-gray-100 text-gray-500 ring-gray-500/10",
    amber: "bg-amber-50 text-amber-700 ring-amber-600/10",
    red: "bg-red-50 text-red-700 ring-red-600/10",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", tones[tone])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", tone === "green" ? "bg-green-500" : tone === "amber" ? "bg-amber-500" : tone === "red" ? "bg-red-500" : "bg-gray-400")} />
      {children}
    </span>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3-3" strokeLinecap="round" />
    </svg>
  );
}
