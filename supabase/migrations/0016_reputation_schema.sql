-- =============================================================================
-- Steel Scale — Reputation module schema
-- Multi-tenant, company-scoped review/reputation management. Every table
-- belongs to a `company`, which is tied 1:1 to an existing `clients` tenant so
-- it inherits the platform's auth. RLS guarantees a user only ever sees their
-- own company's data.
--
-- Tables: companies, review_settings, review_templates, review_workflows,
--         review_contacts, review_requests, review_messages, review_clicks,
--         review_events
-- Reuses public.set_updated_at() and public.current_client_id() from 0001.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. companies — the tenant root for the Reputation module (1:1 with a client)
-- -----------------------------------------------------------------------------
create table if not exists public.companies (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null unique references public.clients(id) on delete cascade,
  name       text not null,
  timezone   text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists companies_client_id_idx on public.companies (client_id);

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- Helper: the company_id of the currently authenticated user (via their client).
-- SECURITY DEFINER so it can resolve the company without tripping RLS.
create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.companies c
  where c.client_id = public.current_client_id()
  limit 1;
$$;

-- -----------------------------------------------------------------------------
-- 2. review_settings — per-company configuration (1:1)
-- -----------------------------------------------------------------------------
create table if not exists public.review_settings (
  id                       uuid primary key default gen_random_uuid(),
  company_id               uuid not null unique references public.companies(id) on delete cascade,
  google_review_url        text,
  facebook_review_url      text,
  yelp_review_url          text,
  default_channel          text not null default 'sms' check (default_channel in ('sms','email')),
  from_name                text,
  reply_to_email           text,
  sms_sender_id            text,
  auto_request_enabled     boolean not null default false,
  auto_request_delay_hours integer not null default 72,
  notify_email             text,
  metadata                 jsonb not null default '{}',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists review_settings_company_id_idx on public.review_settings (company_id);

create trigger review_settings_set_updated_at
  before update on public.review_settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. review_templates — reusable message templates (email / sms)
-- -----------------------------------------------------------------------------
create table if not exists public.review_templates (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name       text not null,
  channel    text not null check (channel in ('sms','email')),
  subject    text,                       -- email only
  body       text not null,
  is_default boolean not null default false,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists review_templates_company_id_idx on public.review_templates (company_id);
create index if not exists review_templates_company_channel_idx on public.review_templates (company_id, channel);

create trigger review_templates_set_updated_at
  before update on public.review_templates
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. review_workflows — automations (trigger -> template -> send)
-- -----------------------------------------------------------------------------
create table if not exists public.review_workflows (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  name           text not null,
  trigger_type   text not null check (trigger_type in ('manual','lead_won','job_completed','review_received','no_response')),
  trigger_config jsonb not null default '{}',
  template_id    uuid references public.review_templates(id) on delete set null,
  channel        text not null default 'sms' check (channel in ('sms','email')),
  delay_minutes  integer not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists review_workflows_company_id_idx on public.review_workflows (company_id);
create index if not exists review_workflows_company_active_idx on public.review_workflows (company_id, is_active);
create index if not exists review_workflows_template_id_idx on public.review_workflows (template_id);

create trigger review_workflows_set_updated_at
  before update on public.review_workflows
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. review_contacts — people we can request reviews from
-- -----------------------------------------------------------------------------
create table if not exists public.review_contacts (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  lead_id           uuid references public.leads(id) on delete set null, -- optional CRM link
  name              text not null,
  email             text,
  phone             text,
  tags              text[] not null default '{}',
  source            text not null default 'manual' check (source in ('manual','lead','import','api')),
  status            text not null default 'new' check (status in ('new','requested','reviewed','opted_out')),
  sms_consent       boolean not null default false,
  last_requested_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists review_contacts_company_id_idx on public.review_contacts (company_id, created_at desc);
create index if not exists review_contacts_company_status_idx on public.review_contacts (company_id, status);
create index if not exists review_contacts_lead_id_idx on public.review_contacts (lead_id);
-- One contact per email / phone within a company.
create unique index if not exists review_contacts_company_email_key
  on public.review_contacts (company_id, lower(email)) where email is not null;
create unique index if not exists review_contacts_company_phone_key
  on public.review_contacts (company_id, phone) where phone is not null;

create trigger review_contacts_set_updated_at
  before update on public.review_contacts
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. review_requests — a review ask sent to a contact
-- -----------------------------------------------------------------------------
create table if not exists public.review_requests (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  contact_id   uuid not null references public.review_contacts(id) on delete cascade,
  template_id  uuid references public.review_templates(id) on delete set null,
  workflow_id  uuid references public.review_workflows(id) on delete set null,
  channel      text not null check (channel in ('sms','email')),
  status       text not null default 'pending'
               check (status in ('pending','scheduled','sent','delivered','opened','clicked','completed','failed','opted_out')),
  review_url   text,
  scheduled_at timestamptz,
  sent_at      timestamptz,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists review_requests_company_id_idx on public.review_requests (company_id, created_at desc);
create index if not exists review_requests_company_status_idx on public.review_requests (company_id, status);
create index if not exists review_requests_contact_id_idx on public.review_requests (contact_id);
create index if not exists review_requests_workflow_id_idx on public.review_requests (workflow_id);
create index if not exists review_requests_scheduled_at_idx on public.review_requests (scheduled_at) where scheduled_at is not null;

create trigger review_requests_set_updated_at
  before update on public.review_requests
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. review_messages — individual messages sent for a request (incl. reminders)
-- -----------------------------------------------------------------------------
create table if not exists public.review_messages (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  request_id          uuid not null references public.review_requests(id) on delete cascade,
  channel             text not null check (channel in ('sms','email')),
  to_address          text not null,     -- phone or email the message was sent to
  subject             text,
  body                text not null,
  provider            text,              -- e.g. 'twilio', 'resend'
  provider_message_id text,
  status              text not null default 'queued'
                      check (status in ('queued','sent','delivered','failed','bounced')),
  error               text,
  sent_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists review_messages_company_id_idx on public.review_messages (company_id, created_at desc);
create index if not exists review_messages_request_id_idx on public.review_messages (request_id);
create index if not exists review_messages_company_status_idx on public.review_messages (company_id, status);
create index if not exists review_messages_provider_msg_idx on public.review_messages (provider_message_id);

create trigger review_messages_set_updated_at
  before update on public.review_messages
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 8. review_clicks — clicks on the review link in a request/message
-- -----------------------------------------------------------------------------
create table if not exists public.review_clicks (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  request_id uuid not null references public.review_requests(id) on delete cascade,
  message_id uuid references public.review_messages(id) on delete set null,
  clicked_at timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  referrer   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists review_clicks_company_id_idx on public.review_clicks (company_id, clicked_at desc);
create index if not exists review_clicks_request_id_idx on public.review_clicks (request_id);

create trigger review_clicks_set_updated_at
  before update on public.review_clicks
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 9. review_events — append-only event log / audit for the module
-- -----------------------------------------------------------------------------
create table if not exists public.review_events (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  request_id  uuid references public.review_requests(id) on delete cascade,
  message_id  uuid references public.review_messages(id) on delete set null,
  contact_id  uuid references public.review_contacts(id) on delete set null,
  event_type  text not null
              check (event_type in ('request_created','message_sent','message_delivered','message_failed',
                                     'opened','clicked','review_received','workflow_started','opted_out')),
  data        jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists review_events_company_id_idx on public.review_events (company_id, occurred_at desc);
create index if not exists review_events_request_id_idx on public.review_events (request_id);
create index if not exists review_events_company_type_idx on public.review_events (company_id, event_type);

create trigger review_events_set_updated_at
  before update on public.review_events
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Row Level Security — users only access their own company's data
-- =============================================================================
alter table public.companies        enable row level security;
alter table public.review_settings  enable row level security;
alter table public.review_templates enable row level security;
alter table public.review_workflows enable row level security;
alter table public.review_contacts  enable row level security;
alter table public.review_requests  enable row level security;
alter table public.review_messages  enable row level security;
alter table public.review_clicks    enable row level security;
alter table public.review_events    enable row level security;

-- companies: a user can access the company tied to their own client tenant.
drop policy if exists "members access own company" on public.companies;
create policy "members access own company"
  on public.companies for all to authenticated
  using (client_id = public.current_client_id())
  with check (client_id = public.current_client_id());

-- Child tables: scoped to the user's company via current_company_id().
drop policy if exists "members access own review_settings" on public.review_settings;
create policy "members access own review_settings"
  on public.review_settings for all to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "members access own review_templates" on public.review_templates;
create policy "members access own review_templates"
  on public.review_templates for all to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "members access own review_workflows" on public.review_workflows;
create policy "members access own review_workflows"
  on public.review_workflows for all to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "members access own review_contacts" on public.review_contacts;
create policy "members access own review_contacts"
  on public.review_contacts for all to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "members access own review_requests" on public.review_requests;
create policy "members access own review_requests"
  on public.review_requests for all to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "members access own review_messages" on public.review_messages;
create policy "members access own review_messages"
  on public.review_messages for all to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "members access own review_clicks" on public.review_clicks;
create policy "members access own review_clicks"
  on public.review_clicks for all to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "members access own review_events" on public.review_events;
create policy "members access own review_events"
  on public.review_events for all to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- Note: server-side jobs (cron, webhooks) use the service-role key, which
-- bypasses RLS, so they can write clicks/messages/events for any company.

-- =============================================================================
-- Provisioning — keep one company per client, automatically
-- =============================================================================

-- Auto-create a company whenever a new client tenant is created.
create or replace function public.create_company_for_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.companies (client_id, name)
  values (new.id, new.name)
  on conflict (client_id) do nothing;
  return new;
end;
$$;

drop trigger if exists clients_create_company on public.clients;
create trigger clients_create_company
  after insert on public.clients
  for each row execute function public.create_company_for_client();

-- Backfill a company for every existing client so the module is ready to use.
insert into public.companies (client_id, name)
select c.id, c.name from public.clients c
on conflict (client_id) do nothing;

