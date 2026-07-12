// ServiceTitan provider definition.
import { registerProvider } from "@/lib/providers/registry";
import type { ProviderDefinition } from "@/lib/providers/types";
import { servicetitanAdapter } from "@/lib/crm/adapters/servicetitan";
import { createServiceTitanIntegration, SERVICETITAN_WEBHOOK_EVENTS } from "@/lib/integration/adapters/servicetitan";

export const servicetitanProvider: ProviderDefinition = {
  descriptor: {
    id: "servicetitan",
    name: "ServiceTitan",
    category: "CRM & Field Service",
    description: "Pull jobs, customers, and invoices to power automations at scale.",
    color: "#0F172A",
    monogram: "S",
    accountLabel: "Tenant",
    authKind: "client_credentials",
  },
  crm: servicetitanAdapter,
  createIntegration: (ctx) => createServiceTitanIntegration(ctx),
  webhookEvents: SERVICETITAN_WEBHOOK_EVENTS,
};

registerProvider(servicetitanProvider);
