// =============================================================================
// Providers — composition root.
//
// This is the one place that knows the full list of built-in providers (a
// standard clean-architecture composition root). Importing it registers every
// provider. Everything else resolves providers dynamically from the registry,
// so adding a CRM means: create one src/lib/providers/adapters/<crm>.ts module
// and add its import here — no other file changes.
//
// Because the platform is event- and canonical-model-driven, a newly registered
// provider automatically flows into Review Automation, CRM, Messaging,
// Analytics, Workflows, and Reports — none of which reference providers.
// =============================================================================

// Side-effect imports: each module self-registers on load.
import "@/lib/providers/adapters/jobber";
import "@/lib/providers/adapters/housecall";
import "@/lib/providers/adapters/servicetitan";

export * from "@/lib/providers/types";
export * from "@/lib/providers/registry";

import { getProviderDefinition } from "@/lib/providers/registry";
import type { CrmProviderAdapter } from "@/lib/crm/provider";
import type { AbstractIntegrationAdapter } from "@/lib/integration/adapter";
import type { ProviderIntegrationContext } from "@/lib/providers/types";

/** Build the integration adapter for a provider id, or null if unknown. */
export function createIntegration(
  providerId: string,
  ctx: ProviderIntegrationContext
): AbstractIntegrationAdapter | null {
  const def = getProviderDefinition(providerId);
  return def ? def.createIntegration(ctx) : null;
}

/** The pure CRM mapper for a provider id, or null if unknown. */
export function getCrmMapper(providerId: string): CrmProviderAdapter | null {
  return getProviderDefinition(providerId)?.crm ?? null;
}

/** Webhook topic → { objectType, eventType } map for a provider id. */
export function getWebhookEvents(providerId: string) {
  return getProviderDefinition(providerId)?.webhookEvents ?? null;
}
