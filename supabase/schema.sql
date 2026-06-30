-- =============================================================================
-- Steel City Growth System — database schema
-- Multi-tenant. Every business is a row in `clients`; everything else is
-- scoped by `client_id`. Run this in the Supabase SQL editor.
-- =============================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- clients (tenants)
-- -----------------------------------------------------------------------------
create table if not exists public.clients (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,          -- public URL: /site/<slug>
  business_name      text not null,
  phone              text,
  email              text,                           -- where lead notifications go
  logo_url           text,
  brand_color        text default '#1e3a8a',
  google_review_link text,
  services           text[] default '{}',
  service_area       text,
  hero_headline      text,
  hero_subheadline    text,
  created_at         timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- profiles — links a Supabase auth user to the client (tenant) they belong to
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  client_id  uuid references public.clients(id) on delete set null,
  full_name  text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- leads
-- -----------------------------------------------------------------------------
create table if not exists public.leads (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  name       text not null,
  email      text,
  phone      text,
  service    text,
  message    text,
  -- status pipeline: new | contacted | estimate_scheduled | won | lost
  status     text not null default 'new',
  created_at timestamptz not null default now()
);
create index if not exists leads_client_id_idx on public.leads (client_id, created_at desc);

-- -----------------------------------------------------------------------------
-- lead_notes
-- -----------------------------------------------------------------------------
create table if not exists public.lead_notes (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  client_id  uuid not null references public.clients(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists lead_notes_lead_id_idx on public.lead_notes (lead_id, created_at desc);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.clients    enable row level security;
alter table public.profiles   enable row level security;
alter table public.leads      enable row level security;
alter table public.lead_notes enable row level security;

-- Helper: the client_id of the currently authenticated user.
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
-- Public sites need to read business config, so allow read to everyone.
drop policy if exists "clients are publicly readable" on public.clients;
create policy "clients are publicly readable"
  on public.clients for select
  using (true);

-- A user may update only their own client record.
drop policy if exists "members update their client" on public.clients;
create policy "members update their client"
  on public.clients for update
  using (id = public.current_client_id())
  with check (id = public.current_client_id());

-- profiles --------------------------------------------------------------------
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
  on public.profiles for select
  using (id = auth.uid());

-- leads -----------------------------------------------------------------------
-- Members read/update leads belonging to their client.
drop policy if exists "members read leads" on public.leads;
create policy "members read leads"
  on public.leads for select
  using (client_id = public.current_client_id());

drop policy if exists "members update leads" on public.leads;
create policy "members update leads"
  on public.leads for update
  using (client_id = public.current_client_id())
  with check (client_id = public.current_client_id());

drop policy if exists "members delete leads" on public.leads;
create policy "members delete leads"
  on public.leads for delete
  using (client_id = public.current_client_id());

-- Public lead capture happens through a server route using the service role
-- key, which bypasses RLS — so no public INSERT policy is needed here.

-- lead_notes ------------------------------------------------------------------
drop policy if exists "members read notes" on public.lead_notes;
create policy "members read notes"
  on public.lead_notes for select
  using (client_id = public.current_client_id());

drop policy if exists "members insert notes" on public.lead_notes;
create policy "members insert notes"
  on public.lead_notes for insert
  with check (client_id = public.current_client_id());

drop policy if exists "members delete notes" on public.lead_notes;
create policy "members delete notes"
  on public.lead_notes for delete
  using (client_id = public.current_client_id());

-- =============================================================================
-- Seed a demo client so the public template renders out of the box.
-- =============================================================================
insert into public.clients (slug, business_name, phone, email, brand_color, google_review_link, services, service_area, hero_headline, hero_subheadline)
values (
  'demo',
  'Steel City Roofing & Exteriors',
  '(412) 555-0142',
  'owner@example.com',
  '#b91c1c',
  'https://g.page/r/your-google-review-link/review',
  array['Roof Replacement', 'Roof Repair', 'Gutters', 'Siding'],
  'Greater Pittsburgh, PA',
  'Pittsburgh''s Trusted Roofing Experts',
  'Free estimates, honest pricing, and workmanship that lasts. Serving the Steel City for over 20 years.'
)
on conflict (slug) do nothing;
