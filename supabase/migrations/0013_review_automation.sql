-- =============================================================================
-- Steel Scale Systems — automated Google review requests
-- Per-client automation that emails/texts past customers (leads marked "Won")
-- a request to leave a Google review, a set number of days after the job.
-- =============================================================================

-- Track when a lead was won (starts the review-request delay clock) and when a
-- review request was actually sent (so nobody gets asked twice).
alter table public.leads
  add column if not exists won_at              timestamptz,
  add column if not exists review_requested_at timestamptz;

-- Per-client review-automation controls.
alter table public.client_settings
  add column if not exists auto_review_enabled    boolean not null default false,
  add column if not exists auto_review_delay_days  integer not null default 3,
  add column if not exists review_request_message  text;  -- optional custom template

-- Backfill won_at for any leads already marked won, so automation has a clock
-- to work from (uses updated_at as a best-effort timestamp).
update public.leads
  set won_at = updated_at
  where status = 'won' and won_at is null;
