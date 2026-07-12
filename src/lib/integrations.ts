// =============================================================================
// Integrations catalog. Client-safe. CRM providers are sourced from the provider
// registry (@/lib/providers) so a newly-registered CRM appears in the
// marketplace automatically; the remaining (non-CRM-adapter) integrations stay
// listed statically here. The DB (integration_connections) stores per-company
// connection state, merged with this catalog at render.
// =============================================================================

import { listProviderDescriptors } from "@/lib/providers";

export type IntegrationStatus = "connected" | "disconnected" | "pending" | "error";

export type IntegrationCategory = "CRM & Field Service" | "Reviews" | "Accounting" | "Automation" | "Developer";

export interface IntegrationDef {
  provider: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  // Brand color used for the logo tile + monogram.
  color: string;
  // Short monogram shown in the logo tile.
  monogram: string;
  // What the account label represents once connected (e.g. "Account", "Company").
  accountLabel: string;
}

export interface IntegrationConnection {
  provider: string;
  status: IntegrationStatus;
  connected_account: string | null;
  config: Record<string, unknown>;
  last_sync_at: string | null;
  connected_at: string | null;
}

// Integrations that are not CRM provider adapters (no ProviderDefinition).
const STATIC_INTEGRATIONS: IntegrationDef[] = [
  {
    provider: "google_business",
    name: "Google Business Profile",
    category: "Reviews",
    description: "Sync reviews and ratings, and route review requests to your Google profile.",
    color: "#4285F4",
    monogram: "G",
    accountLabel: "Profile",
  },
  {
    provider: "jobnimbus",
    name: "JobNimbus",
    category: "CRM & Field Service",
    description: "Connect your roofing pipeline to trigger review requests on won jobs.",
    color: "#F97316",
    monogram: "JN",
    accountLabel: "Account",
  },
  {
    provider: "acculynx",
    name: "AccuLynx",
    category: "CRM & Field Service",
    description: "Sync roofing jobs and contacts to automate reputation workflows.",
    color: "#E11D48",
    monogram: "A",
    accountLabel: "Account",
  },
  {
    provider: "quickbooks",
    name: "QuickBooks",
    category: "Accounting",
    description: "Trigger review requests when invoices are paid and keep customers in sync.",
    color: "#2CA01C",
    monogram: "Q",
    accountLabel: "Company",
  },
  {
    provider: "zapier",
    name: "Zapier",
    category: "Automation",
    description: "Connect Steel Scale to 6,000+ apps with no-code Zaps.",
    color: "#FF4A00",
    monogram: "Z",
    accountLabel: "Workspace",
  },
  {
    provider: "webhooks",
    name: "Webhooks",
    category: "Developer",
    description: "Send real-time events to your own endpoints for custom integrations.",
    color: "#6366F1",
    monogram: "{ }",
    accountLabel: "Endpoint",
  },
];

// Preferred display order; anything registered but unlisted is appended.
const DISPLAY_ORDER = [
  "google_business",
  "jobber",
  "housecall_pro",
  "servicetitan",
  "jobnimbus",
  "acculynx",
  "quickbooks",
  "zapier",
  "webhooks",
];

function buildCatalog(): IntegrationDef[] {
  // CRM providers come from the registry (single source of truth).
  const fromRegistry = new Map<string, IntegrationDef>(
    listProviderDescriptors().map((d) => [
      d.id,
      {
        provider: d.id,
        name: d.name,
        category: d.category as IntegrationCategory,
        description: d.description,
        color: d.color,
        monogram: d.monogram,
        accountLabel: d.accountLabel,
      },
    ])
  );
  const staticById = new Map(STATIC_INTEGRATIONS.map((d) => [d.provider, d]));

  const out: IntegrationDef[] = [];
  const seen = new Set<string>();
  for (const id of DISPLAY_ORDER) {
    const def = fromRegistry.get(id) ?? staticById.get(id);
    if (def) {
      out.push(def);
      seen.add(id);
    }
  }
  // Newly-registered CRMs not in DISPLAY_ORDER appear automatically.
  for (const [id, def] of fromRegistry) if (!seen.has(id)) out.push(def);
  return out;
}

// The marketplace. CRM entries are registry-driven; the rest are static.
export const INTEGRATION_CATALOG: IntegrationDef[] = buildCatalog();

export const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
  "CRM & Field Service",
  "Reviews",
  "Accounting",
  "Automation",
  "Developer",
];

export function integrationDef(provider: string): IntegrationDef | undefined {
  return INTEGRATION_CATALOG.find((i) => i.provider === provider);
}

export const STATUS_META: Record<IntegrationStatus, { label: string; tone: "green" | "gray" | "amber" | "red" }> = {
  connected: { label: "Connected", tone: "green" },
  disconnected: { label: "Not connected", tone: "gray" },
  pending: { label: "Pending", tone: "amber" },
  error: { label: "Action needed", tone: "red" },
};

// Human "time ago" for last-sync display.
export function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
