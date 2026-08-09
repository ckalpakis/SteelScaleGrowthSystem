// =============================================================================
// Integration adapter system — public entry point.
//
//   import { AbstractIntegrationAdapter, type IntegrationAdapter } from "@/lib/integration";
//
// Every CRM integration implements IntegrationAdapter by extending
// AbstractIntegrationAdapter and supplying the provider-specific primitives.
// The base handles normalize → publish orchestration on top of the canonical
// CRM model (@/lib/crm) and the internal event bus (@/lib/events).
// =============================================================================

export * from "@/lib/integration/ports";
export * from "@/lib/integration/types";
export * from "@/lib/integration/adapter";
export * from "@/lib/integration/retry";
export { createIntegrationLogger, consoleIntegrationLogger, multiLogger } from "@/lib/integration/logger";
export { SkeletonIntegrationAdapter } from "@/lib/integration/skeleton";
export {
  JobberIntegrationAdapter,
  createJobberIntegration,
  jobberOAuthConfig,
  mapJobberTopic,
  JOBBER_OAUTH,
  JOBBER_WEBHOOK_EVENTS,
} from "@/lib/integration/adapters/jobber";
export {
  HousecallProIntegrationAdapter,
  createHousecallProIntegration,
  housecallOAuthConfig,
  mapHousecallTopic,
  HOUSECALL_OAUTH,
  HOUSECALL_WEBHOOK_EVENTS,
} from "@/lib/integration/adapters/housecall";
export {
  ServiceTitanIntegrationAdapter,
  createServiceTitanIntegration,
  servicetitanConfig,
  mapServiceTitanEvent,
  SERVICETITAN_OAUTH,
  SERVICETITAN_WEBHOOK_EVENTS,
} from "@/lib/integration/adapters/servicetitan";
