// =============================================================================
// Event Listener service.
//
// Subscribes to ALL standardized platform events and routes them to the
// platform's automations:
//
//   JOB_COMPLETED ─┐
//   INVOICE_PAID ──┼─▶ Review Workflow   (enroll contact into a workflow)
//   APPT_COMPLETED ┘
//   CUSTOMER_CREATED ─▶ CRM Automation   (upsert the contact)
//
// CRITICAL PROPERTY: the automation engine never learns which CRM produced an
// event. This listener consumes only the standardized PlatformEvent shape and
// calls provider-agnostic ports. `provider` is used solely as an id namespace
// for contact resolution — never to branch behavior — and is NOT passed to the
// review-automation port at all.
//
// Pure + dependency-injected (no DB/server imports) so it stays testable. The
// concrete wiring lives in listener.server.ts.
// =============================================================================

import type { CanonicalCustomer } from "@/lib/crm/models";
import type { WorkflowTrigger } from "@/lib/reputation";
import type { PlatformEvent, PlatformEventType } from "@/lib/events/types";
import type { EventBus, Unsubscribe } from "@/lib/events/bus";
import { events as sharedBus } from "@/lib/events/bus";

/** CRM automation: keep review_contacts in sync from standardized customer data. */
export interface ContactAutomationPort {
  /** Ensure a contact exists for this customer; returns its id. */
  upsertContactFromCustomer(companyId: string, provider: string, customer: CanonicalCustomer): Promise<string | null>;
  /** Find an existing contact id for a customer reference. */
  resolveContactId(
    companyId: string,
    provider: string,
    ref: { externalId?: string | null; phone?: string | null; email?: string | null }
  ): Promise<string | null>;
}

/** Review automation. Deliberately provider-free — it only takes a trigger. */
export interface ReviewAutomationPort {
  enrollByTrigger(companyId: string, trigger: WorkflowTrigger, contactId: string): Promise<void>;
}

export interface ListenerLogger {
  log(entry: { level: "info" | "warn" | "error"; action: string; message?: string; context?: Record<string, unknown> }): void | Promise<void>;
}

export interface EventListenerDeps {
  contacts: ContactAutomationPort;
  reviews: ReviewAutomationPort;
  logger?: ListenerLogger;
}

/**
 * Standardized event → review workflow trigger. Workflow triggers ARE the
 * standardized event names, so this is mostly identity; the only aliases fold
 * related events onto one trigger (a payment counts as the invoice being paid).
 * Expressed purely in platform event types — no reference to any provider.
 */
export const EVENT_TRIGGER_MAP: Partial<Record<PlatformEventType, WorkflowTrigger>> = {
  JOB_COMPLETED: "JOB_COMPLETED",
  INVOICE_PAID: "INVOICE_PAID",
  PAYMENT_RECEIVED: "INVOICE_PAID", // a payment satisfies the "invoice paid" trigger
  ESTIMATE_ACCEPTED: "ESTIMATE_ACCEPTED",
  APPOINTMENT_COMPLETED: "APPOINTMENT_COMPLETED",
  CUSTOMER_CREATED: "CUSTOMER_CREATED",
  CONTACT_IMPORTED: "CONTACT_IMPORTED",
};

// Events whose payload carries a full canonical customer (drives CRM automation).
const CUSTOMER_BEARING = new Set<PlatformEventType>(["CUSTOMER_CREATED", "CUSTOMER_UPDATED", "CONTACT_IMPORTED"]);

export class EventListenerService {
  constructor(private readonly deps: EventListenerDeps) {}

  /** Subscribe to every event on the bus. Returns an unsubscribe fn. */
  attach(bus: EventBus = sharedBus): Unsubscribe {
    return bus.onAny((event) => this.handle(event));
  }

  /** Route one standardized event. Never throws. */
  async handle(event: PlatformEvent): Promise<void> {
    try {
      // 1. CRM automation: resolve or create the contact this event concerns.
      const contactId = await this.resolveContact(event);

      // 2. Review automation: map the standardized event to a workflow trigger.
      const trigger = EVENT_TRIGGER_MAP[event.type];
      if (trigger && contactId) {
        await this.deps.reviews.enrollByTrigger(event.companyId, trigger, contactId);
      }

      await this.deps.logger?.log({
        level: "info",
        action: "event.routed",
        context: { type: event.type, trigger: trigger ?? null, contactId, eventId: event.id },
      });
    } catch (err) {
      await this.deps.logger?.log({
        level: "error",
        action: "event.error",
        message: err instanceof Error ? err.message : String(err),
        context: { type: event.type, eventId: event.id },
      });
    }
  }

  private async resolveContact(event: PlatformEvent): Promise<string | null> {
    // Customer-bearing events upsert the contact from the full canonical customer.
    if (CUSTOMER_BEARING.has(event.type)) {
      const customer = (event.payload as { customer?: CanonicalCustomer }).customer;
      if (customer) return this.deps.contacts.upsertContactFromCustomer(event.companyId, event.provider, customer);
    }
    // Other events resolve an existing contact from the standardized ref.
    if (event.customer) {
      return this.deps.contacts.resolveContactId(event.companyId, event.provider, {
        externalId: event.customer.externalId,
        phone: event.customer.phone,
        email: event.customer.email,
      });
    }
    return null;
  }
}

/** Convenience: build + attach a listener to a bus in one call. */
export function attachEventListener(deps: EventListenerDeps, bus: EventBus = sharedBus): Unsubscribe {
  return new EventListenerService(deps).attach(bus);
}
