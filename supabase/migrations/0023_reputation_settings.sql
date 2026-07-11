-- =============================================================================
-- 0023 — Reputation settings fields.
--
-- Extends review_settings (per-company, 1:1) with the configuration surfaced on
-- the Settings page: automation defaults, SMS sending window, quiet hours,
-- timezone, business name, and the review-request signature. Existing columns
-- (google_review_url, etc.) are reused.
-- =============================================================================

alter table public.review_settings
  -- Automation defaults applied to new workflows.
  add column if not exists default_delay_minutes integer not null default 4320,   -- 3 days
  add column if not exists default_reminder_count integer not null default 1,
  -- Local timezone the sending window is evaluated in.
  add column if not exists timezone text not null default 'America/New_York',
  -- SMS sending window (local hour 0–23). Sends happen only within [start,end).
  add column if not exists sms_send_start_hour integer not null default 9
    check (sms_send_start_hour between 0 and 23),
  add column if not exists sms_send_end_hour integer not null default 20
    check (sms_send_end_hour between 0 and 24),
  -- Quiet hours: an explicit no-send window (e.g. overnight).
  add column if not exists quiet_hours_enabled boolean not null default true,
  add column if not exists quiet_start_hour integer not null default 21
    check (quiet_start_hour between 0 and 23),
  add column if not exists quiet_end_hour integer not null default 8
    check (quiet_end_hour between 0 and 23),
  -- Branding used in outbound messages.
  add column if not exists business_name text,
  add column if not exists request_signature text;
