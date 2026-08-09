-- =============================================================================
-- 0034 — Local business directories (Phase 1).
--
-- A directory is a public, SEO-optimized site listing local businesses (the
-- lead-gen "bait"). Agency-admin managed. Two tables:
--   directories        — one directory site (branding, SEO, publish flag)
--   directory_listings — the businesses shown on it (free/premium tiers)
--
-- ACCESS: service-role only (RLS enabled, no anon/authenticated policy), same as
-- the other agency tables. Public directory pages are SERVER-rendered with the
-- service-role client and query only published rows — the browser never gets
-- direct table access.
--
-- ROLLBACK:
--   drop table if exists public.directory_listings;
--   drop table if exists public.directories;
-- =============================================================================

create table if not exists public.directories (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,            -- /directory/<slug>
  name             text not null,
  domain           text unique,                     -- optional custom domain (future mapping)
  tagline          text,
  hero_title       text,
  hero_subtitle    text,
  hero_image_url   text,
  logo_url         text,
  primary_color    text not null default '#1D4ED8',
  meta_title       text,
  meta_description text,
  published        boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger directories_set_updated_at
  before update on public.directories
  for each row execute function public.set_updated_at();

alter table public.directories enable row level security;

create table if not exists public.directory_listings (
  id             uuid primary key default gen_random_uuid(),
  directory_id   uuid not null references public.directories(id) on delete cascade,
  slug           text not null,                     -- unique within the directory
  business_name  text not null,
  category       text,
  description    text,
  address        text,
  city           text,
  state          text,
  postal_code    text,
  phone          text,
  website        text,
  email          text,
  image_url      text,
  tier           text not null default 'free' check (tier in ('free','premium')),
  status         text not null default 'published' check (status in ('published','hidden','draft')),
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (directory_id, slug)
);

create index if not exists directory_listings_dir_status_idx on public.directory_listings (directory_id, status);
create index if not exists directory_listings_dir_category_idx on public.directory_listings (directory_id, category);
create index if not exists directory_listings_dir_tier_idx on public.directory_listings (directory_id, tier);

create trigger directory_listings_set_updated_at
  before update on public.directory_listings
  for each row execute function public.set_updated_at();

alter table public.directory_listings enable row level security;
-- No anon/authenticated policy: all access is server-side via the service role.
