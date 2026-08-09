-- =============================================================================
-- 0026 — Link review contacts to their source CRM record.
--
-- The event listener's "CRM automation" upserts a review_contact when a
-- CUSTOMER_CREATED/CONTACT_IMPORTED event arrives, keyed by the provider's
-- customer id. Later lifecycle events (JOB_COMPLETED, INVOICE_PAID, …) carry
-- only that external customer id, so this lets the listener resolve the existing
-- contact and enroll it — without the automation engine ever seeing the CRM.
-- =============================================================================

alter table public.review_contacts
  add column if not exists external_id text,
  add column if not exists external_provider text;

-- One contact per (company, provider, external id).
create unique index if not exists review_contacts_company_ext_idx
  on public.review_contacts (company_id, external_provider, external_id)
  where external_id is not null;
