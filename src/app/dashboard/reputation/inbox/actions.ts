"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCompanyId } from "@/lib/reputation.server";
import { sendCompanySms } from "@/lib/reputation.sms";
import {
  CONVERSATION_PAGE_SIZE,
  type ConversationMessage,
  type ConversationStatus,
  type MessageDirection,
} from "@/lib/reputation";

const PATH = "/dashboard/reputation/inbox";

type MessageRow = { id: string; direction: string; body: string; status: string; created_at: string };

function toMessage(r: MessageRow): ConversationMessage {
  return {
    id: r.id,
    direction: (r.direction as MessageDirection) ?? "outbound",
    body: r.body,
    status: r.status,
    createdAt: r.created_at,
  };
}

// Load a page of messages for a conversation, oldest→newest. `before` is a
// created_at cursor for infinite scroll (fetch messages older than it).
export async function fetchMessages(
  conversationId: string,
  before?: string | null
): Promise<{ messages: ConversationMessage[]; hasMore: boolean }> {
  const supabase = createClient();
  let query = supabase
    .from("review_messages")
    .select("id, direction, body, status, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(CONVERSATION_PAGE_SIZE);
  if (before) query = query.lt("created_at", before);

  const { data } = await query.returns<MessageRow[]>();
  const rows = data ?? [];
  const hasMore = rows.length === CONVERSATION_PAGE_SIZE;
  // Reverse into chronological order for display.
  return { messages: rows.reverse().map(toMessage), hasMore };
}

// Send an SMS reply in a conversation.
export async function sendReply(
  conversationId: string,
  body: string
): Promise<{ ok: true; message: ConversationMessage } | { ok: false; error: string }> {
  const text = body.trim();
  if (!text) return { ok: false, error: "Message can't be empty." };

  const companyId = await getCurrentCompanyId();
  if (!companyId) return { ok: false, error: "No company is linked to your account." };

  const supabase = createClient();
  const { data: convo } = await supabase
    .from("review_conversations")
    .select("id, customer_phone, contact_id")
    .eq("id", conversationId)
    .maybeSingle<{ id: string; customer_phone: string; contact_id: string | null }>();
  if (!convo) return { ok: false, error: "Conversation not found." };

  const admin = createAdminClient();
  const res = await sendCompanySms(admin, companyId, {
    to: convo.customer_phone,
    body: text,
    contactId: convo.contact_id,
  });
  if (!res.ok || !res.messageId) return { ok: false, error: res.error ?? "Could not send the message." };

  const { data: row } = await admin
    .from("review_messages")
    .select("id, direction, body, status, created_at")
    .eq("id", res.messageId)
    .single<MessageRow>();

  revalidatePath(PATH);
  return { ok: true, message: toMessage(row!) };
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("review_conversations").update({ unread_count: 0 }).eq("id", conversationId);
  revalidatePath(PATH);
}

export async function setConversationStatus(conversationId: string, status: ConversationStatus): Promise<void> {
  const supabase = createClient();
  await supabase.from("review_conversations").update({ status }).eq("id", conversationId);
  revalidatePath(PATH);
}
