-- =============================================================================
-- 0020 — Review link tracking.
--
-- Each review request gets a unique short code used in a tracked URL
-- (growth.steelscale.com/r/<code>). Visiting the link records a click (who,
-- when, IP, browser), advances the request status, and redirects to the
-- destination review URL. review_clicks gains contact_id so analytics can group
-- clicks by customer without a join back through the request.
-- =============================================================================

-- Short code per request. Nullable so existing rows stay valid; new requests
-- always set one (unique when present).
alter table public.review_requests
  add column if not exists short_code text;

create unique index if not exists review_requests_short_code_key
  on public.review_requests (short_code) where short_code is not null;

-- Clicked timestamp for quick "first click" analytics without scanning clicks.
alter table public.review_requests
  add column if not exists clicked_at timestamptz;

-- Record the contact directly on the click row.
alter table public.review_clicks
  add column if not exists contact_id uuid references public.review_contacts(id) on delete set null;

create index if not exists review_clicks_contact_id_idx
  on public.review_clicks (contact_id) where contact_id is not null;
