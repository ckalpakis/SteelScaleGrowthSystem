-- =============================================================================
-- 0025 — Integrations schema (secure).
--
-- Five tables, all company-scoped:
--   company_integrations   — the connection + OAuth credential store
--   integration_events     — domain events received from / emitted to providers
--   integration_logs       — append-only audit / debug log of integration activity
--   integration_webhooks   — registered inbound/outbound webhook endpoints
--   integration_sync_jobs  — background sync jobs (import customers/jobs, etc.)
--
-- SECURITY MODEL
-- -------------
-- Sensitive credentials (access_token, refresh_token, signing_secret) are stored
-- as AES-256-GCM ciphertext produced at the application layer (src/lib/crypto.ts)
-- — never plaintext. The two tables that hold secrets (company_integrations,
-- integration_webhooks) have RLS enabled with NO authenticated policy, so they
-- are reachable only via the service-role client on the server. This mirrors the
-- company_twilio_credentials pattern and guarantees tokens can never be read
-- from the browser.
--
-- The non-secret operational tables (events, logs, sync_jobs) are readable by the
-- owning company (RLS select policy); their rows are written server-side with the
-- service-role client.
--
-- Relationship to 0024's integration_connections: company_integrations is the
-- canonical, secure record. integration_connections is retained as the current
-- marketplace UI's display table and is backfilled into company_integrations
-- below; a later migration can switch the UI over and drop it.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. company_integrations — connection + encrypted OAuth credentials
-- -----------------------------------------------------------------------------
create table if not exists public.company_integrations (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies(id) on delete cascade,
  provider           text not null,                        -- Provider Name (catalog key)
  status             text not null default 'disconnected'
                     check (status in ('connected','disconnected','pending','error','revoked')),
  connected_user     text,                                 -- Connected User (display name/email)
  connected_user_id  text,                                 -- provider-side user/account id
  scopes             text[] not null default '{}',         -- granted OAuth scopes
  access_token       text,                                 -- ENCRYPTED (AES-256-GCM ciphertext)
  refresh_token      text,                                 -- ENCRYPTED (AES-256-GCM ciphertext)
  token_type         text,                                 -- e.g. 'Bearer'
  expires_at         timestamptz,                          -- access-token Expiration
  metadata           jsonb not null default '{}',          -- non-secret provider metadata
  last_synced_at     timestamptz,
  last_error         text,
  connected_at       timestamptz,
  created_at         timestamptz not null default now(),   -- Created
  updated_at         timestamptz not null default now(),   -- Updated
  unique (company_id, provider)
);

comment on column public.company_integrations.access_token  is 'AES-256-GCM ciphertext (app-encrypted). Never store plaintext.';
comment on column public.company_integrations.refresh_token is 'AES-256-GCM ciphertext (app-encrypted). Never store plaintext.';

create index if not exists company_integrations_company_idx
  on public.company_integrations (company_id);
create index if not exists company_integrations_company_status_idx
  on public.company_integrations (company_id, status);
create index if not exists company_integrations_provider_idx
  on public.company_integrations (provider);
-- Token-refresh sweep: connected integrations whose access token is expiring.
create index if not exists company_integrations_expiring_idx
  on public.company_integrations (expires_at)
  where status = 'connected' and expires_at is not null;

create trigger company_integrations_set_updated_at
  before update on public.company_integrations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. integration_events — provider domain events (job.completed, invoice.paid…)
-- -----------------------------------------------------------------------------
create table if not exists public.integration_events (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  integration_id uuid references public.company_integrations(id) on delete cascade,
  provider       text not null,
  event_type     text not null,                            -- e.g. 'job.completed'
  external_id    text,                                     -- provider event id (idempotency)
  direction      text not null default 'inbound' check (direction in ('inbound','outbound')),
  status         text not null default 'received'
                 check (status in ('received','processed','failed','ignored')),
  payload        jsonb not null default '{}',
  error          text,
  occurred_at    timestamptz,
  processed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists integration_events_company_idx
  on public.integration_events (company_id, created_at desc);
create index if not exists integration_events_integration_idx
  on public.integration_events (integration_id);
create index if not exists integration_events_company_type_idx
  on public.integration_events (company_id, event_type);
create index if not exists integration_events_status_idx
  on public.integration_events (status) where status in ('received','failed');
-- Idempotency: a provider event is ingested at most once.
create unique index if not exists integration_events_provider_external_key
  on public.integration_events (provider, external_id) where external_id is not null;

create trigger integration_events_set_updated_at
  before update on public.integration_events
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. integration_logs — append-only audit / debug trail
-- -----------------------------------------------------------------------------
create table if not exists public.integration_logs (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  integration_id uuid references public.company_integrations(id) on delete set null,
  provider       text,
  level          text not null default 'info' check (level in ('debug','info','warn','error')),
  action         text,                                     -- e.g. 'oauth.connect','sync.customers'
  message        text,
  context        jsonb not null default '{}',              -- non-secret only; never log tokens
  http_status    integer,
  duration_ms    integer,
  created_at     timestamptz not null default now()
);

create index if not exists integration_logs_company_idx
  on public.integration_logs (company_id, created_at desc);
create index if not exists integration_logs_integration_idx
  on public.integration_logs (integration_id);
create index if not exists integration_logs_company_level_idx
  on public.integration_logs (company_id, level);

-- -----------------------------------------------------------------------------
-- 4. integration_webhooks — registered webhook endpoints (holds a secret)
-- -----------------------------------------------------------------------------
create table if not exists public.integration_webhooks (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  integration_id   uuid references public.company_integrations(id) on delete cascade,
  provider         text,
  direction        text not null default 'outbound' check (direction in ('inbound','outbound')),
  target_url       text,                                   -- outbound: where we POST events
  event_types      text[] not null default '{}',           -- which events trigger delivery
  signing_secret   text,                                   -- ENCRYPTED (AES-256-GCM ciphertext)
  external_id      text,                                   -- provider-side subscription id
  status           text not null default 'active' check (status in ('active','paused','failed')),
  last_delivery_at timestamptz,
  last_status      integer,
  failure_count    integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on column public.integration_webhooks.signing_secret is 'AES-256-GCM ciphertext (app-encrypted). Never store plaintext.';

create index if not exists integration_webhooks_company_idx
  on public.integration_webhooks (company_id);
create index if not exists integration_webhooks_integration_idx
  on public.integration_webhooks (integration_id);
create unique index if not exists integration_webhooks_provider_external_key
  on public.integration_webhooks (provider, external_id) where external_id is not null;

create trigger integration_webhooks_set_updated_at
  before update on public.integration_webhooks
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. integration_sync_jobs — background sync work
-- -----------------------------------------------------------------------------
create table if not exists public.integration_sync_jobs (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies(id) on delete cascade,
  integration_id     uuid references public.company_integrations(id) on delete cascade,
  provider           text,
  job_type           text not null,                        -- e.g. 'import_customers','full_sync'
  status             text not null default 'queued'
                     check (status in ('queued','running','succeeded','failed','canceled')),
  cursor             text,                                 -- pagination cursor for incremental sync
  scheduled_at       timestamptz not null default now(),
  started_at         timestamptz,
  finished_at        timestamptz,
  attempts           integer not null default 0,
  records_processed  integer not null default 0,
  records_failed     integer not null default 0,
  stats              jsonb not null default '{}',
  error              text,
  locked_at          timestamptz,                          -- claim lock for the worker
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists integration_sync_jobs_company_idx
  on public.integration_sync_jobs (company_id, created_at desc);
create index if not exists integration_sync_jobs_integration_idx
  on public.integration_sync_jobs (integration_id);
create index if not exists integration_sync_jobs_provider_idx
  on public.integration_sync_jobs (provider);
-- Due-work lookup for the worker.
create index if not exists integration_sync_jobs_due_idx
  on public.integration_sync_jobs (scheduled_at)
  where status in ('queued','running');

create trigger integration_sync_jobs_set_updated_at
  before update on public.integration_sync_jobs
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.company_integrations   enable row level security;
alter table public.integration_events      enable row level security;
alter table public.integration_logs        enable row level security;
alter table public.integration_webhooks    enable row level security;
alter table public.integration_sync_jobs   enable row level security;

-- Secret-holding tables: NO authenticated policy → service-role only.
-- (RLS denies by default; the service-role client bypasses RLS on the server.)

-- Operational tables: the owning company may READ; all writes are server-side
-- (service role), so no insert/update/delete policy is defined for authenticated.
drop policy if exists "members read own integration_events" on public.integration_events;
create policy "members read own integration_events"
  on public.integration_events for select to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "members read own integration_logs" on public.integration_logs;
create policy "members read own integration_logs"
  on public.integration_logs for select to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "members read own integration_sync_jobs" on public.integration_sync_jobs;
create policy "members read own integration_sync_jobs"
  on public.integration_sync_jobs for select to authenticated
  using (company_id = public.current_company_id());

-- =============================================================================
-- Backfill company_integrations from the existing marketplace table (0024).
-- Tokens remain null (none were ever stored); non-secret fields carry over.
-- =============================================================================
insert into public.company_integrations
  (company_id, provider, status, connected_user, metadata, last_synced_at, connected_at, created_at, updated_at)
select
  ic.company_id, ic.provider, ic.status, ic.connected_account,
  coalesce(ic.config, '{}'::jsonb), ic.last_sync_at, ic.connected_at, ic.created_at, ic.updated_at
from public.integration_connections ic
on conflict (company_id, provider) do nothing;
