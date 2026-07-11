-- =============================================================================
-- Steel Scale — Reputation: contact job fields
-- Adds the service performed and the completed-job date to review contacts,
-- surfaced as columns on the Contacts page.
-- =============================================================================

alter table public.review_contacts
  add column if not exists service            text,
  add column if not exists completed_job_date date;

create index if not exists review_contacts_company_completed_idx
  on public.review_contacts (company_id, completed_job_date desc);
