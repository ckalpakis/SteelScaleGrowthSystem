-- =============================================================================
-- 0028 — Google Business Profile sync storage.
--
-- google_business_profiles: one row per company holding the synced location +
-- aggregate rating. google_reviews: the individual reviews pulled from Google.
-- OAuth tokens are NOT stored here — they live encrypted in company_integrations
-- (service-role only). These tables are readable by the owning company so the
-- Reputation dashboard can show real ratings; writes are server-side.
-- =============================================================================

create table if not exists public.google_business_profiles (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null unique references public.companies(id) on delete cascade,
  account_name   text,                 -- "accounts/{accountId}"
  location_name  text,                 -- "accounts/{accountId}/locations/{locationId}"
  location_title text,
  average_rating numeric(2,1),
  total_reviews  integer not null default 0,
  new_review_uri text,                 -- direct "leave a review" link, when available
  last_synced_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists google_business_profiles_company_idx
  on public.google_business_profiles (company_id);

create trigger google_business_profiles_set_updated_at
  before update on public.google_business_profiles
  for each row execute function public.set_updated_at();

create table if not exists public.google_reviews (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  review_id         text not null,      -- Google review id
  reviewer_name     text,
  rating            integer check (rating between 1 and 5),
  comment           text,
  review_created_at timestamptz,
  review_updated_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (company_id, review_id)
);

create index if not exists google_reviews_company_idx
  on public.google_reviews (company_id, review_created_at desc);

create trigger google_reviews_set_updated_at
  before update on public.google_reviews
  for each row execute function public.set_updated_at();

-- RLS — the owning company can read its Google data; writes are server-side.
alter table public.google_business_profiles enable row level security;
alter table public.google_reviews enable row level security;

drop policy if exists "members read own google_business_profiles" on public.google_business_profiles;
create policy "members read own google_business_profiles"
  on public.google_business_profiles for select to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "members read own google_reviews" on public.google_reviews;
create policy "members read own google_reviews"
  on public.google_reviews for select to authenticated
  using (company_id = public.current_company_id());
