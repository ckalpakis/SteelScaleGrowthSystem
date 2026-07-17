-- =============================================================================
-- 0031 — Onboarding provisioning worker: leases, claim RPCs, webhook creds.
--
-- Adds the infrastructure the provisioning engine needs on top of migration
-- 0029/0030:
--   1. A lease on provisioning_runs so only one worker processes a run at a time.
--   2. claim_next_provisioning_run() — atomically pick + lease the next queued run
--      (SKIP LOCKED), for the background drain.
--   3. claim_provisioning_run() — (re)lease a SPECIFIC run, for admin-triggered
--      retry of a needs_action/failed run.
--   4. client_webhook_credentials — one client-scoped inbound webhook credential.
--      Only the secret HASH is stored; a short-lived, encrypted handoff column
--      holds the raw secret for a one-time admin reveal, then is cleared.
--
-- All access is server-side (service role); RLS is enabled with no policy.
--
-- ROLLBACK (manual):
--   drop function if exists public.claim_next_provisioning_run(text, integer);
--   drop function if exists public.claim_provisioning_run(uuid, text, integer);
--   drop table if exists public.client_webhook_credentials cascade;
--   alter table public.provisioning_runs
--     drop column if exists locked_by,
--     drop column if exists lease_expires_at;
-- =============================================================================

-- 1. Lease columns.
alter table public.provisioning_runs
  add column if not exists locked_by        text,
  add column if not exists lease_expires_at timestamptz;

create index if not exists provisioning_runs_lease_idx
  on public.provisioning_runs (status, lease_expires_at);

-- 2. Claim the next available run for the background drain.
--    Eligible: queued, OR a stale 'running' lease that has expired.
create or replace function public.claim_next_provisioning_run(p_worker text, p_lease_seconds integer)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.provisioning_runs
  where status = 'queued'
     or (status = 'running' and lease_expires_at is not null and lease_expires_at < now())
  order by created_at asc
  for update skip locked
  limit 1;

  if v_id is null then
    return null;
  end if;

  update public.provisioning_runs
  set status = 'running',
      locked_by = p_worker,
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      started_at = coalesce(started_at, now()),
      attempt_count = attempt_count + 1
  where id = v_id;

  return v_id;
end;
$$;

-- 3. (Re)lease a specific run. Used by admin-triggered retry, which must be able
--    to re-run a run that is currently needs_action or failed.
create or replace function public.claim_provisioning_run(p_run_id uuid, p_worker text, p_lease_seconds integer)
returns boolean
language plpgsql
as $$
declare
  v_count integer;
begin
  update public.provisioning_runs
  set status = 'running',
      locked_by = p_worker,
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      started_at = coalesce(started_at, now()),
      attempt_count = attempt_count + 1
  where id = p_run_id
    and (
      status in ('queued', 'needs_action', 'failed')
      or (status = 'running' and lease_expires_at is not null and lease_expires_at < now())
    );

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

-- 4. Client-scoped inbound webhook credential (one per client for the MVP).
create table if not exists public.client_webhook_credentials (
  id                 uuid primary key default gen_random_uuid(),
  client_account_id  uuid not null unique references public.client_accounts(id) on delete cascade,
  ghl_location_id    text,
  public_id          text not null unique,            -- non-secret public identifier
  secret_hash        text not null,                   -- sha256(raw secret); raw never stored plaintext
  secret_ciphertext  text,                            -- AES-256-GCM handoff; cleared after reveal/expiry
  secret_expires_at  timestamptz,                     -- handoff validity window
  enabled            boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists client_webhook_credentials_client_idx
  on public.client_webhook_credentials (client_account_id);

create trigger client_webhook_credentials_set_updated_at
  before update on public.client_webhook_credentials
  for each row execute function public.set_updated_at();

alter table public.client_webhook_credentials enable row level security;
