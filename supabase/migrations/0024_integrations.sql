-- =============================================================================
-- 0024 — Integrations.
--
-- One row per (company, provider) tracking a company's connection to an
-- external tool (Jobber, QuickBooks, Zapier, …). This is the persistence layer
-- only — no external API calls yet. Credentials/tokens are intentionally NOT
-- stored here; when real OAuth is added, secrets go in a separate table with no
-- authenticated RLS policy (like company_twilio_credentials). This table holds
-- non-secret connection metadata that is safe to show in the dashboard.
-- =============================================================================

create table if not exists public.integration_connections (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  provider          text not null,          -- catalog key, e.g. 'jobber','quickbooks'
  status            text not null default 'disconnected'
                    check (status in ('connected','disconnected','pending','error')),
  connected_account text,                    -- display label, e.g. account email / business name
  config            jsonb not null default '{}',   -- non-secret settings (webhook url, sync prefs)
  last_sync_at      timestamptz,
  last_error        text,
  connected_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (company_id, provider)
);

create index if not exists integration_connections_company_idx
  on public.integration_connections (company_id);
create index if not exists integration_connections_company_status_idx
  on public.integration_connections (company_id, status);

create trigger integration_connections_set_updated_at
  before update on public.integration_connections
  for each row execute function public.set_updated_at();

-- RLS — users only see their own company's integrations.
alter table public.integration_connections enable row level security;

drop policy if exists "members access own integration_connections" on public.integration_connections;
create policy "members access own integration_connections"
  on public.integration_connections for all to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
