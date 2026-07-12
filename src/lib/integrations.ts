// =============================================================================
// Integrations catalog — the static definitions of every integration we offer.
// Client-safe (no server imports). The DB (integration_connections) stores the
// per-company connection state, which is merged with this catalog at render.
// =============================================================================

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

// The initial marketplace. Ordered by category relevance for home-service SaaS.
export const INTEGRATION_CATALOG: IntegrationDef[] = [
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
    provider: "jobber",
    name: "Jobber",
    category: "CRM & Field Service",
    description: "Import clients and jobs, and trigger review requests when a job is completed.",
    color: "#1CA67A",
    monogram: "J",
    accountLabel: "Account",
  },
  {
    provider: "housecall_pro",
    name: "Housecall Pro",
    category: "CRM & Field Service",
    description: "Sync customers and completed jobs to automate follow-ups and reviews.",
    color: "#2563EB",
    monogram: "H",
    accountLabel: "Account",
  },
  {
    provider: "servicetitan",
    name: "ServiceTitan",
    category: "CRM & Field Service",
    description: "Pull jobs, customers, and invoices to power automations at scale.",
    color: "#0F172A",
    monogram: "S",
    accountLabel: "Tenant",
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
