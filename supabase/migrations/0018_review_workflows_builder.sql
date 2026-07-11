-- =============================================================================
-- 0018 — Extend review_workflows for the visual workflow builder.
--
-- Adds the fields the builder configures (delay, reminders, stop conditions)
-- and a free-form `config` jsonb so the workflow shape can grow (extra steps,
-- branching, multi-channel) without another migration. Existing columns
-- (name, trigger_type, template_id, channel, delay_minutes, is_active) are
-- reused as-is.
-- =============================================================================

-- Broaden the trigger set to the builder's triggers while keeping the older
-- values valid for backward compatibility.
alter table public.review_workflows
  drop constraint if exists review_workflows_trigger_type_check;

alter table public.review_workflows
  add constraint review_workflows_trigger_type_check
  check (trigger_type in (
    'manual',
    'job_completed',
    'invoice_paid',
    'contact_imported',
    'appointment_completed',
    -- legacy values kept so existing rows/migrations remain valid
    'lead_won',
    'review_received',
    'no_response'
  ));

-- Reminder cadence: how many follow-ups, and how long to wait between each.
alter table public.review_workflows
  add column if not exists reminder_count integer not null default 0,
  add column if not exists reminder_delay_minutes integer not null default 1440,
  -- Conditions that halt the workflow early (e.g. the customer already reviewed).
  add column if not exists stop_conditions text[] not null default '{}',
  -- Forward-compatible bag for future step/branch config.
  add column if not exists config jsonb not null default '{}';
