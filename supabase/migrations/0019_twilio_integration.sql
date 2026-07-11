-- =============================================================================
-- 0019 — Per-company Twilio integration.
--
-- 1. company_twilio_credentials: one Twilio account per company. The auth token
--    is stored encrypted (AES-256-GCM at the app layer). RLS is enabled with NO
--    authenticated policy, so the table is only reachable via the service-role
--    client on the server — credentials are never exposed to the frontend.
--
-- 2. Extend review_messages to record message direction, the sender address for
--    inbound replies, and the full set of Twilio delivery statuses. request_id
--    becomes nullable so inbound replies and ad-hoc sends need not belong to a
--    review request.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. company_twilio_credentials
-- ---------------------------------------------------------------------------
create table if not exists public.company_twilio_credentials (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null unique references public.companies(id) on delete cascade,
  account_sid           text not null,
  messaging_service_sid text,
  phone_number          text,
  auth_token_encrypted  text not null,          -- AES-256-GCM ciphertext (v1:iv:tag:ct)
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists company_twilio_credentials_company_id_idx
  on public.company_twilio_credentials (company_id);

-- Look up the owning company from the inbound/destination phone number.
create index if not exists company_twilio_credentials_phone_idx
  on public.company_twilio_credentials (phone_number) where phone_number is not null;

create trigger company_twilio_credentials_set_updated_at
  before update on public.company_twilio_credentials
  for each row execute function public.set_updated_at();

-- RLS on, but deliberately NO policy for authenticated users: all reads/writes
-- go through server-side code using the service-role client. This guarantees the
-- encrypted auth token can never be selected from the browser.
alter table public.company_twilio_credentials enable row level security;

-- ---------------------------------------------------------------------------
-- 2. review_messages: direction, inbound sender, full Twilio status set
-- ---------------------------------------------------------------------------
alter table public.review_messages
  add column if not exists direction text not null default 'outbound'
    check (direction in ('outbound','inbound')),
  add column if not exists from_address text;

-- request_id is no longer mandatory (inbound replies / ad-hoc sends have none).
alter table public.review_messages
  alter column request_id drop not null;

-- Broaden the status set to Twilio's delivery lifecycle + inbound.
alter table public.review_messages
  drop constraint if exists review_messages_status_check;

alter table public.review_messages
  add constraint review_messages_status_check
  check (status in (
    'queued','sending','sent','delivered','undelivered','failed',
    'received','read','accepted',
    'bounced'  -- legacy email status, kept valid
  ));

create index if not exists review_messages_company_direction_idx
  on public.review_messages (company_id, direction, created_at desc);
