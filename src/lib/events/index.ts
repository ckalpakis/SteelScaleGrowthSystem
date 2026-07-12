// =============================================================================
// Internal event system — public entry point.
//
//   import { createEvent, events } from "@/lib/events";
//
//   const evt = createEvent("JOB_COMPLETED", {
//     companyId, provider: "jobber", source: "webhook",
//     customer: { externalId: job.customerExternalId },
//     payload: { job },
//   });
//   await events.emit(evt);
//
// Producers build events with createEvent() and publish them on a bus; feature
// modules subscribe. No provider-specific logic anywhere in this layer.
// =============================================================================

export * from "@/lib/events/types";
export * from "@/lib/events/bus";
export * from "@/lib/events/listener";

import {
  EVENT_SCHEMA_VERSION,
  type PlatformEvent,
  type PlatformEventType,
  type PlatformEventOf,
  type EventPayloadMap,
  type EventProvider,
  type EventSource,
  type EventCustomerRef,
} from "@/lib/events/types";

function uuid(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Fallback for environments without crypto.randomUUID.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface CreateEventInput<K extends PlatformEventType> {
  companyId: string;
  provider: EventProvider;
  source: EventSource;
  payload: EventPayloadMap[K];
  customer?: EventCustomerRef | null;
  /** When the underlying thing happened. Defaults to now. */
  occurredAt?: string | Date;
  correlationId?: string | null;
  dedupeKey?: string | null;
}

/** Build a fully-formed, typed platform event. Pure — does not emit. */
export function createEvent<K extends PlatformEventType>(type: K, input: CreateEventInput<K>): PlatformEventOf<K> {
  const now = new Date();
  const occurred =
    input.occurredAt instanceof Date
      ? input.occurredAt.toISOString()
      : input.occurredAt ?? now.toISOString();

  return {
    id: uuid(),
    type,
    companyId: input.companyId,
    provider: input.provider,
    source: input.source,
    occurredAt: occurred,
    receivedAt: now.toISOString(),
    customer: input.customer ?? null,
    correlationId: input.correlationId ?? null,
    dedupeKey: input.dedupeKey ?? null,
    version: EVENT_SCHEMA_VERSION,
    payload: input.payload,
  };
}

/**
 * Convenience: build an event and emit it on the given bus (defaults to the
 * shared `events` bus). Returns the emit result.
 */
import { events, type EventBus, type EmitResult } from "@/lib/events/bus";

export async function publishEvent<K extends PlatformEventType>(
  type: K,
  input: CreateEventInput<K>,
  bus: EventBus = events
): Promise<EmitResult> {
  // createEvent returns PlatformEventOf<K>, which is by construction one member
  // of the PlatformEvent union; TS can't prove that for a generic K.
  return bus.emit(createEvent(type, input) as PlatformEvent);
}
