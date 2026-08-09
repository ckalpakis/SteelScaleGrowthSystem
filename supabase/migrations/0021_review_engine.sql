-- =============================================================================
-- 0021 — Review request engine (scheduled workflow runtime).
--
-- A review_request row IS a workflow run for one contact. These columns hold the
-- run's state machine so a background cron can advance it: the next action, when
-- it's due, how many reminders have gone out, retry attempts, and a claim lock
-- that serializes workers and prevents double-processing.
--
-- Idempotency: every outbound workflow message carries a step_key
-- ('initial', 'reminder_1', …). A partial unique index guarantees the same step
-- can never be sent twice for a request, even under concurrent/retried runs.
-- =============================================================================

alter table public.review_requests
  -- What the engine should do next for this run.
  add column if not exists next_action text not null default 'send_initial'
    check (next_action in ('send_initial','send_reminder','complete','done')),
  add column if not exists reminders_sent integer not null default 0,
  -- Transient-failure retry accounting (exponential backoff).
  add column if not exists attempts integer not null default 0,
  -- Claim lock: set while a worker is processing; cleared when it finishes.
  add column if not exists locked_at timestamptz;

-- Due-work lookup: runs whose next action is ready to fire.
create index if not exists review_requests_due_idx
  on public.review_requests (scheduled_at)
  where next_action in ('send_initial','send_reminder','complete') and scheduled_at is not null;

-- Idempotency key for outbound workflow steps.
alter table public.review_messages
  add column if not exists step_key text;

create unique index if not exists review_messages_request_step_key
  on public.review_messages (request_id, step_key)
  where step_key is not null and direction = 'outbound';
