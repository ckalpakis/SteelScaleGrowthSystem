-- =============================================================================
-- 0029 — GoHighLevel client onboarding & provisioning foundation.
--
-- Database + domain foundation only (no UI, no GHL API calls). Eight tables:
--   onboarding_invitations, client_accounts, ghl_connections, ghl_locations,
--   ghl_custom_value_mappings, provisioning_runs, provisioning_steps, admin_tasks
--
-- ACCESS MODEL (matches this repo's convention for non-tenant / secret data):
--   These tables belong to the AGENCY, not to a logged-in tenant, and onboarding
--   clients have no auth user. So RLS is enabled with NO anon/authenticated
--   policy — every read/write is server-side via the service-role client.
--     * Admins: gated in the app by requireAgencyAdmin() then createAdminClient()
--       (same pattern as the developer console / integration dashboard).
--     * Public onboarding: a token-gated service-role route (like /api/leads);
--       the browser never gets direct table access.
--   This is deliberately the strictest boundary: anon + authenticated are denied
--   everything here by default.
--
-- SECRETS: no OAuth token is stored in plaintext. For the single-agency MVP the
-- agency token lives in an env var; ghl_connections holds only non-secret
-- metadata. The nullable *_encrypted columns are reserved for a future OAuth
-- flow and, if ever used, must hold AES-256-GCM ciphertext (src/lib/crypto.ts).
--
-- ROLLBACK: this migration is purely additive (new tables only; nothing existing
-- is altered). To roll back, run the DROP block at the bottom of this file.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. onboarding_invitations — secure, expiring link to complete onboarding.
--    Only a hash of the token is stored; the raw token is shown to the admin
--    once. Reuse after submission is prevented in the app (status = submitted).
-- -----------------------------------------------------------------------------
create table if not exists public.onboarding_invitations (
  id                 uuid primary key default gen_random_uuid(),
  public_token_hash  text not null unique,          -- sha256(raw token); raw never stored
  client_email       text,
  status             text not null default 'pending'
                     check (status in ('pending','opened','submitted','expired','revoked')),
  expires_at         timestamptz not null,
  opened_at          timestamptz,
  submitted_at       timestamptz,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists onboarding_invitations_status_idx on public.onboarding_invitations (status);
create index if not exists onboarding_invitations_expires_idx on public.onboarding_invitations (expires_at);

create trigger onboarding_invitations_set_updated_at
  before update on public.onboarding_invitations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. client_accounts — the onboarded business (one per completed invitation).
-- -----------------------------------------------------------------------------
create table if not exists public.client_accounts (
  id                             uuid primary key default gen_random_uuid(),
  onboarding_invitation_id       uuid unique references public.onboarding_invitations(id) on delete set null,
  legal_business_name            text not null,
  public_business_name           text not null,
  owner_first_name               text not null,
  primary_email                  text not null,
  primary_phone                  text not null,          -- normalized to E.164 by the app
  website_url                    text,
  address_line_1                 text,
  address_line_2                 text,
  city                           text,
  state                          text,
  postal_code                    text,
  country                        text,
  timezone                       text,
  google_review_link             text,
  logo_url                       text,
  primary_brand_color            text,
  email_sending_domain           text,
  follow_up_count                integer not null default 0 check (follow_up_count between 0 and 3),
  review_request_limit_14_days   integer not null default 0
                                 check (review_request_limit_14_days >= 0 and review_request_limit_14_days <= 500),
  current_review_requests_14_days integer not null default 0 check (current_review_requests_14_days >= 0),
  ask_for_referral               boolean not null default false,
  status                         text not null default 'onboarding'
                                 check (status in ('onboarding','provisioning','needs_action','active','paused','failed')),
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now()
);

create index if not exists client_accounts_status_idx on public.client_accounts (status);
create index if not exists client_accounts_invitation_idx on public.client_accounts (onboarding_invitation_id);

create trigger client_accounts_set_updated_at
  before update on public.client_accounts
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. ghl_connections — agency-level GHL integration (NOT per client).
--    Single-agency MVP: at most one active connection. Tokens are NOT stored
--    here in plaintext (see header); *_encrypted are reserved for future OAuth.
-- -----------------------------------------------------------------------------
create table if not exists public.ghl_connections (
  id                     uuid primary key default gen_random_uuid(),
  ghl_company_id         text,                          -- agency / company id
  authentication_type    text not null default 'private_integration'
                         check (authentication_type in ('oauth','private_integration','api_key')),
  access_token_encrypted  text,                         -- reserved; AES-256-GCM ciphertext only
  refresh_token_encrypted text,                         -- reserved; AES-256-GCM ciphertext only
  token_expires_at       timestamptz,
  scopes                 text[] not null default '{}',
  status                 text not null default 'inactive'
                         check (status in ('active','inactive','error')),
  last_verified_at       timestamptz,
  metadata               jsonb not null default '{}',   -- non-secret metadata only
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- At most one active agency connection (schema stays extendable for more rows).
create unique index if not exists ghl_connections_single_active_idx
  on public.ghl_connections ((true)) where status = 'active';

create trigger ghl_connections_set_updated_at
  before update on public.ghl_connections
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. ghl_locations — the GHL sub-account for a client (one location per client).
-- -----------------------------------------------------------------------------
create table if not exists public.ghl_locations (
  id                   uuid primary key default gen_random_uuid(),
  client_account_id    uuid not null unique references public.client_accounts(id) on delete cascade,
  ghl_location_id      text unique,                     -- GHL's location id (set after creation)
  ghl_company_id       text,
  snapshot_id          text,
  snapshot_status      text not null default 'not_started'
                       check (snapshot_status in ('not_started','pending','applied','manual_required','failed')),
  custom_values_status text not null default 'not_started'
                       check (custom_values_status in ('not_started','pending','complete','failed')),
  provider_status      text not null default 'not_started'
                       check (provider_status in ('not_started','pending','complete','failed')),
  last_synced_at       timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists ghl_locations_client_account_idx on public.ghl_locations (client_account_id);

create trigger ghl_locations_set_updated_at
  before update on public.ghl_locations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. ghl_custom_value_mappings — canonical setting name → GHL custom value.
--    Seeded template (one row per canonical key). Discovered per-location IDs
--    are recorded in provisioning_steps.metadata for now.
-- -----------------------------------------------------------------------------
create table if not exists public.ghl_custom_value_mappings (
  id                    uuid primary key default gen_random_uuid(),
  canonical_key         text not null unique,
  expected_ghl_key      text,                            -- may be a legacy GHL key name
  expected_display_name text,
  ghl_custom_value_id   text,                            -- optional globally-known id
  required              boolean not null default true,
  value_type            text not null default 'string'
                        check (value_type in ('string','number','boolean','url','image_url','enum')),
  active                boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger ghl_custom_value_mappings_set_updated_at
  before update on public.ghl_custom_value_mappings
  for each row execute function public.set_updated_at();

-- Seed the canonical keys. expected_ghl_key uses the real (incl. legacy) GHL
-- custom-value names. NOTE: follow_up_count maps to the legacy "service_type".
insert into public.ghl_custom_value_mappings
  (canonical_key, expected_ghl_key, expected_display_name, required, value_type)
values
  ('google_review_link', 'google_review_link', 'Google Review Link', true,  'url'),
  ('logo_link',          'logo_link',          'Logo Link',          true,  'image_url'),
  ('text_1_image_link',  'text_1_image_link',  'Text 1 Image Link',  false, 'image_url'),
  ('business_owner_name', 'business_owner_name', 'Business Owner Name', true, 'string'),
  ('business_name',      'business_name',      'Business Name',       true,  'string'),
  ('email_sending_domain', '9_email_sending_subdomain_after_the_', 'Email Sending Subdomain', true, 'string'),
  ('minimum_review_requests_per_14_days', 'minimum_review_requests_per_14_days', 'Minimum Review Requests Per 14 Days', true, 'number'),
  ('follow_up_count',    'service_type',       'Service Type (legacy: follow-up count)', true, 'number'),
  ('review_requests_per_14_days', 'review_requests_per_14_days', 'Review Requests Per 14 Days', true, 'number'),
  ('ask_for_referral',   '10_ask_for_a_referral_if_customer_has_already_left_a_review_yes_or_no', 'Ask For A Referral', true, 'enum')
on conflict (canonical_key) do nothing;

-- -----------------------------------------------------------------------------
-- 6. provisioning_runs — one attempt at provisioning a client's GHL location.
-- -----------------------------------------------------------------------------
create table if not exists public.provisioning_runs (
  id                 uuid primary key default gen_random_uuid(),
  client_account_id  uuid not null references public.client_accounts(id) on delete cascade,
  ghl_location_id    text,                               -- GHL location id once known
  status             text not null default 'queued'
                     check (status in ('queued','running','needs_action','complete','failed')),
  current_step       text,
  attempt_count      integer not null default 0,
  started_at         timestamptz,
  completed_at       timestamptz,
  error_code         text,
  safe_error_message text,                               -- user/admin-safe; no secrets
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists provisioning_runs_client_idx on public.provisioning_runs (client_account_id, created_at desc);
create index if not exists provisioning_runs_status_idx on public.provisioning_runs (status);

create trigger provisioning_runs_set_updated_at
  before update on public.provisioning_runs
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. provisioning_steps — the individual steps of a run (one row per step key).
-- -----------------------------------------------------------------------------
create table if not exists public.provisioning_steps (
  id                 uuid primary key default gen_random_uuid(),
  provisioning_run_id uuid not null references public.provisioning_runs(id) on delete cascade,
  step_key           text not null
                     check (step_key in (
                       'validate_submission','create_ghl_location','obtain_location_token',
                       'apply_snapshot','discover_custom_values','update_custom_values',
                       'create_webhook_credential','run_health_checks','finalize')),
  status             text not null default 'pending'
                     check (status in ('pending','running','complete','skipped','manual_required','failed')),
  attempt_count      integer not null default 0,
  started_at         timestamptz,
  completed_at       timestamptz,
  error_code         text,
  safe_error_message text,
  metadata           jsonb not null default '{}',        -- no secrets
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (provisioning_run_id, step_key)
);

create index if not exists provisioning_steps_run_idx on public.provisioning_steps (provisioning_run_id);

create trigger provisioning_steps_set_updated_at
  before update on public.provisioning_steps
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 8. admin_tasks — manual admin to-dos (e.g. loading a snapshot when unsupported).
-- -----------------------------------------------------------------------------
create table if not exists public.admin_tasks (
  id                  uuid primary key default gen_random_uuid(),
  client_account_id   uuid not null references public.client_accounts(id) on delete cascade,
  provisioning_run_id uuid references public.provisioning_runs(id) on delete set null,
  task_type           text not null,                     -- e.g. 'load_review_snapshot'
  title               text not null,
  instructions        text,
  status              text not null default 'open'
                      check (status in ('open','complete','dismissed')),
  due_at              timestamptz,
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists admin_tasks_status_idx on public.admin_tasks (status);
create index if not exists admin_tasks_client_idx on public.admin_tasks (client_account_id);

create trigger admin_tasks_set_updated_at
  before update on public.admin_tasks
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Row Level Security — enable on every table, add NO anon/authenticated policy.
-- All access is server-side via the service-role client (admins after
-- requireAgencyAdmin(); public onboarding via a token-gated service route).
-- =============================================================================
alter table public.onboarding_invitations      enable row level security;
alter table public.client_accounts             enable row level security;
alter table public.ghl_connections             enable row level security;
alter table public.ghl_locations               enable row level security;
alter table public.ghl_custom_value_mappings   enable row level security;
alter table public.provisioning_runs           enable row level security;
alter table public.provisioning_steps          enable row level security;
alter table public.admin_tasks                 enable row level security;

-- =============================================================================
-- ROLLBACK (run manually to undo this migration; additive-only, safe to drop):
--
--   drop table if exists public.admin_tasks               cascade;
--   drop table if exists public.provisioning_steps        cascade;
--   drop table if exists public.provisioning_runs         cascade;
--   drop table if exists public.ghl_custom_value_mappings cascade;
--   drop table if exists public.ghl_locations             cascade;
--   drop table if exists public.ghl_connections           cascade;
--   drop table if exists public.client_accounts           cascade;
--   drop table if exists public.onboarding_invitations    cascade;
-- =============================================================================
