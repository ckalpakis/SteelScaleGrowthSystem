-- =============================================================================
-- 0032 — Admin audit log + workflow webhook idempotency.
--
--   1. admin_audit_log — records every administrator action on onboarding /
--      provisioning (who, what, which target). Append-only in practice.
--   2. workflow_webhook_events — idempotency ledger for the client review
--      workflow webhook (dedupe by the GHL-supplied idempotency key).
--
-- Service-role only (RLS enabled, no policy), consistent with 0029/0031.
--
-- ROLLBACK (manual):
--   drop table if exists public.workflow_webhook_events cascade;
--   drop table if exists public.admin_audit_log cascade;
-- =============================================================================

create table if not exists public.admin_audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor_email   text,                       -- admin who performed the action
  action        text not null,              -- e.g. 'invitation.create', 'provisioning.retry'
  target_type   text,                       -- e.g. 'client_account', 'admin_task'
  target_id     text,
  metadata      jsonb not null default '{}',-- non-secret context only
  created_at    timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_target_idx on public.admin_audit_log (target_type, target_id);

alter table public.admin_audit_log enable row level security;

-- -----------------------------------------------------------------------------
-- workflow_webhook_events — one row per processed workflow webhook, keyed by the
-- idempotency key so a retried delivery is a safe no-op.
-- -----------------------------------------------------------------------------
create table if not exists public.workflow_webhook_events (
  id                 uuid primary key default gen_random_uuid(),
  idempotency_key    text not null unique,
  client_account_id  uuid references public.client_accounts(id) on delete set null,
  ghl_location_id    text,
  event_type         text,
  status             text not null default 'received'
                     check (status in ('received','processed','skipped','failed')),
  safe_error_message text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists workflow_webhook_events_client_idx on public.workflow_webhook_events (client_account_id, created_at desc);

create trigger workflow_webhook_events_set_updated_at
  before update on public.workflow_webhook_events
  for each row execute function public.set_updated_at();

alter table public.workflow_webhook_events enable row level security;
