// Jobber provider definition. One self-contained module: descriptor + mapper +
// integration factory. Registering it is all that's needed to add Jobber.
import { registerProvider } from "@/lib/providers/registry";
import type { ProviderDefinition } from "@/lib/providers/types";
import { jobberAdapter } from "@/lib/crm/adapters/jobber";
import { createJobberIntegration, JOBBER_WEBHOOK_EVENTS } from "@/lib/integration/adapters/jobber";

export const jobberProvider: ProviderDefinition = {
  descriptor: {
    id: "jobber",
    name: "Jobber",
    category: "CRM & Field Service",
    description: "Import clients and jobs, and trigger review requests when a job is completed.",
    color: "#1CA67A",
    monogram: "J",
    accountLabel: "Account",
    authKind: "oauth",
  },
  crm: jobberAdapter,
  createIntegration: (ctx) => createJobberIntegration(ctx),
  webhookEvents: JOBBER_WEBHOOK_EVENTS,
};

registerProvider(jobberProvider);
