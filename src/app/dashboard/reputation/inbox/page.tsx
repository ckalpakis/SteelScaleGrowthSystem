import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/reputation/ui";
import { ConversationsApp } from "@/components/dashboard/reputation/inbox/ConversationsApp";
import { type ConversationListItem, type ConversationStatus, type MessageDirection } from "@/lib/reputation";

export const dynamic = "force-dynamic";

type ConversationRow = {
  id: string;
  contact_id: string | null;
  customer_phone: string;
  status: string;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_direction: string | null;
  contact: { name: string } | { name: string }[] | null;
};

function contactName(c: ConversationRow["contact"]): string | null {
  if (!c) return null;
  return Array.isArray(c) ? c[0]?.name ?? null : c.name;
}

export default async function InboxPage() {
  const supabase = createClient();

  const { data } = await supabase
    .from("review_conversations")
    .select("id, contact_id, customer_phone, status, unread_count, last_message_at, last_message_preview, last_message_direction, contact:review_contacts(name)")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(200)
    .returns<ConversationRow[]>();

  const conversations: ConversationListItem[] = (data ?? []).map((r) => ({
    id: r.id,
    contactId: r.contact_id,
    name: contactName(r.contact) ?? r.customer_phone,
    phone: r.customer_phone,
    status: (r.status as ConversationStatus) ?? "open",
    unread: r.unread_count ?? 0,
    lastMessageAt: r.last_message_at,
    lastPreview: r.last_message_preview,
    lastDirection: (r.last_message_direction as MessageDirection) ?? null,
  }));

  return (
    <div className="space-y-5">
      <PageHeader title="Conversations" description="Every SMS with your customers in one place." />
      <ConversationsApp initialConversations={conversations} />
    </div>
  );
}
