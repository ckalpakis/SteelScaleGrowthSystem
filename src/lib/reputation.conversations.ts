import type { SupabaseClient } from "@supabase/supabase-js";
import { toE164 } from "@/lib/sms";

// =============================================================================
// Conversation helpers. A conversation is keyed by (company, customer phone).
// Used by the SMS send path and the inbound webhook to keep the inbox in sync.
// Server-only.
// =============================================================================

const PREVIEW_MAX = 160;

// Find (or create) the conversation for a customer number. Does not mutate the
// last-message / unread fields — call touchConversation for that.
export async function getOrCreateConversation(
  admin: SupabaseClient,
  companyId: string,
  customerPhone: string,
  contactId?: string | null
): Promise<string | null> {
  const phone = toE164(customerPhone) ?? customerPhone;
  if (!phone) return null;

  const { data: existing } = await admin
    .from("review_conversations")
    .select("id, contact_id")
    .eq("company_id", companyId)
    .eq("customer_phone", phone)
    .maybeSingle<{ id: string; contact_id: string | null }>();

  if (existing) {
    // Backfill the contact link if we now know it.
    if (contactId && !existing.contact_id) {
      await admin.from("review_conversations").update({ contact_id: contactId }).eq("id", existing.id);
    }
    return existing.id;
  }

  const { data: created, error } = await admin
    .from("review_conversations")
    .insert({ company_id: companyId, customer_phone: phone, contact_id: contactId ?? null })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    // Unique-violation race: fetch the row the other writer created.
    if (error.code === "23505") {
      const { data: race } = await admin
        .from("review_conversations")
        .select("id")
        .eq("company_id", companyId)
        .eq("customer_phone", phone)
        .maybeSingle<{ id: string }>();
      return race?.id ?? null;
    }
    return null;
  }
  return created?.id ?? null;
}

// Update a conversation's last-message summary + unread/status after a message.
export async function touchConversation(
  admin: SupabaseClient,
  conversationId: string,
  opts: { direction: "inbound" | "outbound"; preview: string; at?: Date }
): Promise<void> {
  const { data: convo } = await admin
    .from("review_conversations")
    .select("unread_count, status")
    .eq("id", conversationId)
    .maybeSingle<{ unread_count: number; status: string }>();

  const inbound = opts.direction === "inbound";
  const update: Record<string, unknown> = {
    last_message_at: (opts.at ?? new Date()).toISOString(),
    last_message_preview: opts.preview.slice(0, PREVIEW_MAX),
    last_message_direction: opts.direction,
    // Inbound bumps unread; an outbound reply clears it (the agent is caught up).
    unread_count: inbound ? (convo?.unread_count ?? 0) + 1 : 0,
  };
  // A new inbound message reopens a closed/archived thread.
  if (inbound && convo?.status !== "open") update.status = "open";

  await admin.from("review_conversations").update(update).eq("id", conversationId);
}
