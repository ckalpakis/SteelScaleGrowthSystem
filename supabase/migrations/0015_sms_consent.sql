-- =============================================================================
-- Steel Scale Systems — SMS consent (TCPA / A2P compliance)
-- Records whether the lead opted in to text messages on the quote form. Only
-- consented leads are texted; this column is the proof of opt-in.
-- =============================================================================

alter table public.leads
  add column if not exists sms_consent boolean not null default false;
