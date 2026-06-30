-- =============================================================================
-- Steel City Growth System — initial schema
-- Multi-tenant CRM. Every business is a row in `clients`; everything else is
-- scoped by `client_id`. RLS guarantees a logged-in user only ever sees their
-- own client's data.
--
-- Tables: clients, client_settings, profiles, leads, lead_notes
-- =============================================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- -----------------------------------------------------------------------------
-- Shared updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. clients (tenants) — core identity of each business
-- -----------------------------------------------------------------------------
create table if not exists public.clients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text unique not null,            -- public URL: /site/<slug>
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. client_settings (1:1 with clients) — branding + contact config
-- -----------------------------------------------------------------------------
create table if not exists public.client_settings (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null unique references public.clients(id) on delete cascade,
  business_name      text,
  phone              text,
  email              text,                    -- where new-lead emails are sent
  logo_url           text,
  brand_color        text default '#1e3a8a',
  google_review_link text,
  services           text[] default '{}',
  service_area       text,
  hero_headline      text,
  hero_subheadline   text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger client_settings_set_updated_at
  before update on public.client_settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. profiles — links a Supabase auth user to the client they belong to
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  client_id  uuid references public.clients(id) on delete set null,
  full_name  text,
  role       text not null default 'member',  -- member | owner
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. leads — every lead MUST belong to a client
-- -----------------------------------------------------------------------------
create table if not exists public.leads (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients(id) on delete cascade,
  name           text not null,
  phone          text,
  email          text,
  service_needed text,
  message        text,
  source         text not null default 'website',
  -- pipeline: new | contacted | estimate_scheduled | won | lost
  status         text not null default 'new'
                 check (status in ('new','contacted','estimate_scheduled','won','lost')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists leads_client_id_idx on public.leads (client_id, created_at desc);

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. lead_notes — notes attached to a lead, authored by a user
-- -----------------------------------------------------------------------------
create table if not exists public.lead_notes (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  note       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lead_notes_lead_id_idx on public.lead_notes (lead_id, created_at desc);

create trigger lead_notes_set_updated_at
  before update on public.lead_notes
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.clients         enable row level security;
alter table public.client_settings enable row level security;
alter table public.profiles        enable row level security;
alter table public.leads           enable row level security;
alter table public.lead_notes      enable row level security;

-- Helper: the client_id of the currently authenticated user.
-- SECURITY DEFINER so it can read profiles without tripping RLS (and avoids
-- recursive policy evaluation).
create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id from public.profiles where id = auth.uid();
$$;

-- clients ---------------------------------------------------------------------
-- Public sites read business identity, so allow read to everyone.
drop policy if exists "clients readable" on public.clients;
create policy "clients readable"
  on public.clients for select
  using (true);

drop policy if exists "members update own client" on public.clients;
create policy "members update own client"
  on public.clients for update
  using (id = public.current_client_id())
  with check (id = public.current_client_id());

-- client_settings -------------------------------------------------------------
-- Public sites need branding (logo, colors, services), so allow read to everyone.
drop policy if exists "settings readable" on public.client_settings;
create policy "settings readable"
  on public.client_settings for select
  using (true);

drop policy if exists "members update own settings" on public.client_settings;
create policy "members update own settings"
  on public.client_settings for update
  using (client_id = public.current_client_id())
  with check (client_id = public.current_client_id());

drop policy if exists "members insert own settings" on public.client_settings;
create policy "members insert own settings"
  on public.client_settings for insert
  with check (client_id = public.current_client_id());

-- profiles --------------------------------------------------------------------
-- A user can read their own profile and teammates in the same client.
drop policy if exists "read profiles in same client" on public.profiles;
create policy "read profiles in same client"
  on public.profiles for select
  using (id = auth.uid() or client_id = public.current_client_id());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- leads -----------------------------------------------------------------------
-- THE core tenancy rule: users only ever touch leads for their own client.
drop policy if exists "members select leads" on public.leads;
create policy "members select leads"
  on public.leads for select
  using (client_id = public.current_client_id());

drop policy if exists "members insert leads" on public.leads;
create policy "members insert leads"
  on public.leads for insert
  with check (client_id = public.current_client_id());

drop policy if exists "members update leads" on public.leads;
create policy "members update leads"
  on public.leads for update
  using (client_id = public.current_client_id())
  with check (client_id = public.current_client_id());

drop policy if exists "members delete leads" on public.leads;
create policy "members delete leads"
  on public.leads for delete
  using (client_id = public.current_client_id());

-- NOTE: public website lead capture goes through a server route using the
-- service-role key, which bypasses RLS. That's why there is no public INSERT
-- policy here — anonymous visitors never write to the table directly.

-- lead_notes ------------------------------------------------------------------
-- A note is visible/editable if its lead belongs to the user's client.
drop policy if exists "members select notes" on public.lead_notes;
create policy "members select notes"
  on public.lead_notes for select
  using (
    exists (
      select 1 from public.leads l
      where l.id = lead_notes.lead_id
        and l.client_id = public.current_client_id()
    )
  );

drop policy if exists "members insert notes" on public.lead_notes;
create policy "members insert notes"
  on public.lead_notes for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.leads l
      where l.id = lead_notes.lead_id
        and l.client_id = public.current_client_id()
    )
  );

drop policy if exists "authors delete own notes" on public.lead_notes;
create policy "authors delete own notes"
  on public.lead_notes for delete
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.leads l
      where l.id = lead_notes.lead_id
        and l.client_id = public.current_client_id()
    )
  );

-- =============================================================================
-- Optional seed: a demo client so the public template renders out of the box.
-- Safe to remove for production.
-- =============================================================================
insert into public.clients (slug, name)
values ('demo', 'Steel City Roofing & Exteriors')
on conflict (slug) do nothing;

insert into public.client_settings (
  client_id, business_name, phone, email, brand_color,
  google_review_link, services, service_area, hero_headline, hero_subheadline
)
select
  c.id,
  'Steel City Roofing & Exteriors',
  '(412) 555-0142',
  'owner@example.com',
  '#b91c1c',
  'https://g.page/r/your-google-review-link/review',
  array['Roof Replacement','Roof Repair','Gutters','Siding'],
  'Greater Pittsburgh, PA',
  'Pittsburgh''s Trusted Roofing Experts',
  'Free estimates, honest pricing, and workmanship that lasts.'
from public.clients c
where c.slug = 'demo'
on conflict (client_id) do nothing;
