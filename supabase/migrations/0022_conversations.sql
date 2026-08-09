-- =============================================================================
-- 0022 — Conversations (SMS inbox).
--
-- A conversation groups all SMS with one customer number for a company. Each
-- review_message is linked to its conversation; the conversation row keeps the
-- denormalized fields a messaging UI needs (last message, unread count, status)
-- so the list renders without scanning every message.
-- =============================================================================

create table if not exists public.review_conversations (
  id                     uuid primary key default gen_random_uuid(),
  company_id             uuid not null references public.companies(id) on delete cascade,
  contact_id             uuid references public.review_contacts(id) on delete set null,
  customer_phone         text not null,
  channel                text not null default 'sms' check (channel in ('sms','email')),
  status                 text not null default 'open' check (status in ('open','closed','archived')),
  unread_count           integer not null default 0,
  last_message_at        timestamptz,
  last_message_preview   text,
  last_message_direction text check (last_message_direction in ('inbound','outbound')),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (company_id, customer_phone)
);

create index if not exists review_conversations_company_recent_idx
  on public.review_conversations (company_id, last_message_at desc nulls last);
create index if not exists review_conversations_company_status_idx
  on public.review_conversations (company_id, status);
create index if not exists review_conversations_contact_idx
  on public.review_conversations (contact_id) where contact_id is not null;

create trigger review_conversations_set_updated_at
  before update on public.review_conversations
  for each row execute function public.set_updated_at();

-- Link messages to their conversation.
alter table public.review_messages
  add column if not exists conversation_id uuid references public.review_conversations(id) on delete set null;

create index if not exists review_messages_conversation_idx
  on public.review_messages (conversation_id, created_at) where conversation_id is not null;

-- RLS — users only see their own company's conversations.
alter table public.review_conversations enable row level security;

drop policy if exists "members access own review_conversations" on public.review_conversations;
create policy "members access own review_conversations"
  on public.review_conversations for all to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
