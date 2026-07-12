// =============================================================================
// Event Listener — concrete server wiring.
//
// Builds the provider-agnostic ports the EventListenerService needs from the
// real platform: contact upsert/resolve against review_contacts, and review
// enrollment via the existing engine (enrollByTrigger). Call startEventListeners()
// once per server invocation that emits events (e.g. at the top of an
// integration webhook route) so the in-memory bus has a subscriber attached.
// =============================================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { enrollByTrigger } from "@/lib/reputation.engine";
import { toE164 } from "@/lib/sms";
import type { CanonicalCustomer } from "@/lib/crm/models";
import { events as sharedBus, type EventBus } from "@/lib/events/bus";
import {
  EventListenerService,
  type EventListenerDeps,
  type ContactAutomationPort,
  type ReviewAutomationPort,
} from "@/lib/events/listener";

type Admin = ReturnType<typeof createAdminClient>;

function contactsPort(admin: Admin): ContactAutomationPort {
  async function findByExternal(companyId: string, provider: string, externalId: string): Promise<string | null> {
    const { data } = await admin
      .from("review_contacts")
      .select("id")
      .eq("company_id", companyId)
      .eq("external_provider", provider)
      .eq("external_id", externalId)
      .maybeSingle<{ id: string }>();
    return data?.id ?? null;
  }

  return {
    async upsertContactFromCustomer(companyId, provider, customer: CanonicalCustomer) {
      const externalId = customer.externalId;
      const phone = toE164(customer.phones?.[0]?.value ?? null);
      const email = customer.emails?.[0] ?? null;
      const name = customer.displayName || "Unknown";

      if (externalId) {
        const existingId = await findByExternal(companyId, provider, externalId);
        if (existingId) {
          await admin.from("review_contacts").update({ name, phone, email }).eq("id", existingId);
          return existingId;
        }
      }

      const { data, error } = await admin
        .from("review_contacts")
        .insert({
          company_id: companyId,
          name,
          phone,
          email,
          external_id: externalId,
          external_provider: provider,
          source: "crm",
        })
        .select("id")
        .single<{ id: string }>();

      // Unique-race: another writer created it first — re-resolve.
      if (error?.code === "23505" && externalId) return findByExternal(companyId, provider, externalId);
      return data?.id ?? null;
    },

    async resolveContactId(companyId, provider, ref) {
      if (ref.externalId) {
        const byExt = await findByExternal(companyId, provider, ref.externalId);
        if (byExt) return byExt;
      }
      const phone = toE164(ref.phone ?? null);
      if (phone) {
        const { data } = await admin
          .from("review_contacts")
          .select("id")
          .eq("company_id", companyId)
          .eq("phone", phone)
          .maybeSingle<{ id: string }>();
        if (data) return data.id;
      }
      if (ref.email) {
        const { data } = await admin
          .from("review_contacts")
          .select("id")
          .eq("company_id", companyId)
          .eq("email", ref.email)
          .maybeSingle<{ id: string }>();
        if (data) return data.id;
      }
      return null;
    },
  };
}

// The review-automation port. Note it receives no provider — the engine stays
// entirely unaware of which CRM generated the event.
function reviewsPort(admin: Admin): ReviewAutomationPort {
  return {
    async enrollByTrigger(companyId, trigger, contactId) {
      await enrollByTrigger(admin, companyId, trigger, contactId);
    },
  };
}

export function buildEventListenerDeps(admin: Admin = createAdminClient()): EventListenerDeps {
  return {
    contacts: contactsPort(admin),
    reviews: reviewsPort(admin),
    logger: {
      log: (entry) => {
        if (entry.level === "error") console.error("[event-listener]", entry.action, entry.message, entry.context);
      },
    },
  };
}

let attached = false;

/** Attach the platform's event listener to a bus (idempotent per process). */
export function startEventListeners(bus: EventBus = sharedBus): void {
  if (attached) return;
  new EventListenerService(buildEventListenerDeps()).attach(bus);
  attached = true;
}
