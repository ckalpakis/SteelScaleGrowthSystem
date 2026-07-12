// =============================================================================
// Provider registry — the single definition of a CRM provider.
//
// A ProviderDefinition bundles EVERYTHING a provider needs into one object:
// its marketplace descriptor (presentation), its pure CRM data mapper, and a
// factory that builds its integration adapter. Registering one of these is all
// it takes to add a CRM — every cross-cutting system (marketplace, sync,
// webhooks, review automation, analytics, reports) reads from the registry, so
// none of them change.
// =============================================================================

import type { CanonicalObjectType } from "@/lib/crm/models";
import type { CrmProviderAdapter } from "@/lib/crm/provider";
import type { PlatformEventType } from "@/lib/events/types";
import type { AbstractIntegrationAdapter, IntegrationContext } from "@/lib/integration/adapter";

/** Context a provider factory receives — provider + crm are filled by the def. */
export type ProviderIntegrationContext = Omit<IntegrationContext, "provider" | "crm">;

/** Client-safe presentation metadata (drives the marketplace card). */
export interface ProviderDescriptor {
  id: string;
  name: string;
  category: string;
  description: string;
  color: string;
  monogram: string;
  accountLabel: string;
  authKind: "oauth" | "client_credentials";
}

/** The complete, self-contained definition of a provider. */
export interface ProviderDefinition {
  descriptor: ProviderDescriptor;
  /** Pure data mapper: raw provider records → canonical model. */
  crm: CrmProviderAdapter;
  /** Builds the integration adapter (API + webhook orchestration). */
  createIntegration: (ctx: ProviderIntegrationContext) => AbstractIntegrationAdapter;
  /** Webhook topic/event → canonical object + standardized event. */
  webhookEvents?: Record<string, { objectType: CanonicalObjectType; eventType: PlatformEventType }>;
}
