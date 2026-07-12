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
export { SkeletonIntegrationAdapter } from "@/lib/integration/skeleton";
