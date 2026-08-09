// Housecall Pro provider definition.
import { registerProvider } from "@/lib/providers/registry";
import type { ProviderDefinition } from "@/lib/providers/types";
import { housecallAdapter } from "@/lib/crm/adapters/housecall";
import { createHousecallProIntegration, HOUSECALL_WEBHOOK_EVENTS } from "@/lib/integration/adapters/housecall";

export const housecallProvider: ProviderDefinition = {
  descriptor: {
    id: "housecall_pro",
    name: "Housecall Pro",
    category: "CRM & Field Service",
    description: "Sync customers and completed jobs to automate follow-ups and reviews.",
    color: "#2563EB",
    monogram: "H",
    accountLabel: "Account",
    authKind: "oauth",
  },
  crm: housecallAdapter,
  createIntegration: (ctx) => createHousecallProIntegration(ctx),
  webhookEvents: HOUSECALL_WEBHOOK_EVENTS,
};

registerProvider(housecallProvider);
