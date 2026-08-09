// =============================================================================
// Internal event system — the bus.
//
// A small, reusable in-process pub/sub. Feature modules subscribe to event
// types (or to everything via onAny); producers emit fully-formed events. The
// bus is provider-agnostic: it never inspects `provider` or payload contents,
// it only routes by `type`.
//
// Delivery is error-isolated — one failing handler never blocks the others —
// and emit() awaits all handlers, returning a summary the caller can log.
// =============================================================================

import type { PlatformEvent, PlatformEventType, PlatformEventOf } from "@/lib/events/types";

export type EventHandler<E = PlatformEvent> = (event: E) => void | Promise<void>;

/** Unsubscribe function returned by every subscription call. */
export type Unsubscribe = () => void;

export interface EmitResult {
  event: PlatformEvent;
  handled: number;
  errors: { handler?: string; error: unknown }[];
}

const WILDCARD = "*" as const;

export class EventBus {
  // type -> set of handlers. WILDCARD holds onAny() handlers.
  private handlers = new Map<string, Set<EventHandler>>();

  /** Subscribe to a single event type. Returns an unsubscribe fn. */
  on<K extends PlatformEventType>(type: K, handler: EventHandler<PlatformEventOf<K>>): Unsubscribe {
    return this.add(type, handler as EventHandler);
  }

  /** Subscribe to several event types with one handler. */
  onMany(types: PlatformEventType[], handler: EventHandler): Unsubscribe {
    const offs = types.map((t) => this.add(t, handler));
    return () => offs.forEach((off) => off());
  }

  /** Subscribe to every event. */
  onAny(handler: EventHandler): Unsubscribe {
    return this.add(WILDCARD, handler);
  }

  /** Subscribe once; auto-unsubscribes after the first delivery. */
  once<K extends PlatformEventType>(type: K, handler: EventHandler<PlatformEventOf<K>>): Unsubscribe {
    const off = this.on(type, async (event) => {
      off();
      await handler(event);
    });
    return off;
  }

  /** Remove a specific handler from a type (or WILDCARD). */
  off(type: PlatformEventType | typeof WILDCARD, handler: EventHandler): void {
    this.handlers.get(type)?.delete(handler);
  }

  /** Drop all handlers (useful in tests). */
  clear(): void {
    this.handlers.clear();
  }

  /** Number of handlers registered for a type (plus wildcard). */
  listenerCount(type: PlatformEventType): number {
    return (this.handlers.get(type)?.size ?? 0) + (this.handlers.get(WILDCARD)?.size ?? 0);
  }

  /**
   * Dispatch an event to all matching handlers. Awaits every handler; a throw in
   * one is captured, not propagated. Never throws.
   */
  async emit(event: PlatformEvent): Promise<EmitResult> {
    const targeted = this.handlers.get(event.type);
    const wildcard = this.handlers.get(WILDCARD);
    const all: EventHandler[] = [...(targeted ?? []), ...(wildcard ?? [])];

    const errors: EmitResult["errors"] = [];
    await Promise.all(
      all.map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          errors.push({ handler: handler.name || "anonymous", error });
        }
      })
    );

    return { event, handled: all.length, errors };
  }

  private add(type: string, handler: EventHandler): Unsubscribe {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler);
    return () => set!.delete(handler);
  }
}

// A shared, app-wide bus. Create additional EventBus instances for isolation
// (e.g. per-test) when needed.
export const events = new EventBus();
