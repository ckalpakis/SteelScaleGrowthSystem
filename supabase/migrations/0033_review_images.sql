-- =============================================================================
-- 0033 — Personalized review-request images (MMS).
--
-- Per-client config for a "Nifty-style" personalized image: a base photo (e.g.
-- the client's team) with the recipient's name overlaid, generated on the fly
-- and attached as MMS on the first two review-request texts.
--
-- Service-role only (RLS enabled, no policies) — same convention as the other
-- onboarding tables. The base image lives in the existing client-media bucket.
--
-- ROLLBACK:  drop table if exists public.client_review_images;
-- =============================================================================

create table if not exists public.client_review_images (
  id                 uuid primary key default gen_random_uuid(),
  client_account_id  uuid not null unique references public.client_accounts(id) on delete cascade,
  enabled            boolean not null default false,
  base_image_path    text,                                   -- storage path in client-media
  base_image_url     text,                                   -- public URL of the base image
  name_template      text not null default '{name}',         -- {name} is replaced per recipient
  text_color         text not null default '#FFFFFF',
  font_size          integer not null default 72 check (font_size between 12 and 300),
  text_position      text not null default 'bottom'
                     check (text_position in ('top','center','bottom')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger client_review_images_set_updated_at
  before update on public.client_review_images
  for each row execute function public.set_updated_at();

alter table public.client_review_images enable row level security;
-- No anon/authenticated policy: all access is server-side via the service role.
