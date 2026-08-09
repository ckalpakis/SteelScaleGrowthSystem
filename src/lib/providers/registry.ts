// =============================================================================
// Provider registry. The single source of truth for which CRMs exist. Provider
// modules self-register here on import; consumers read from it.
// =============================================================================

import type { ProviderDefinition, ProviderDescriptor } from "@/lib/providers/types";

const registry = new Map<string, ProviderDefinition>();

/** Register a provider. Idempotent per id (later wins). */
export function registerProvider(def: ProviderDefinition): void {
  registry.set(def.descriptor.id, def);
}

export function getProviderDefinition(id: string): ProviderDefinition | undefined {
  return registry.get(id);
}

export function hasProvider(id: string): boolean {
  return registry.has(id);
}

export function listProviders(): ProviderDefinition[] {
  return [...registry.values()];
}

/** Presentation metadata for every registered provider. */
export function listProviderDescriptors(): ProviderDescriptor[] {
  return listProviders().map((p) => p.descriptor);
}
