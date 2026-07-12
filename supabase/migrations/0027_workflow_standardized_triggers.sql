-- =============================================================================
-- 0027 — Standardized-event workflow triggers.
--
-- review_workflows.trigger_type now holds a STANDARDIZED platform event name
-- (JOB_COMPLETED, INVOICE_PAID, …) or MANUAL, instead of the old provider-style
-- lowercase triggers. A workflow fires whenever the matching event is published,
-- regardless of which CRM produced it. Existing rows are migrated to the new
-- vocabulary; legacy values remain valid during the transition.
-- =============================================================================

alter table public.review_workflows
  drop constraint if exists review_workflows_trigger_type_check;

alter table public.review_workflows
  add constraint review_workflows_trigger_type_check
  check (trigger_type in (
    'JOB_COMPLETED',
    'INVOICE_PAID',
    'ESTIMATE_ACCEPTED',
    'APPOINTMENT_COMPLETED',
    'CUSTOMER_CREATED',
    'CONTACT_IMPORTED',
    'MANUAL',
    -- legacy values kept valid so in-flight rows/migrations don't break
    'job_completed','invoice_paid','contact_imported','appointment_completed',
    'manual','lead_won','review_received','no_response'
  ));

-- Migrate existing rows to the standardized event names.
update public.review_workflows set trigger_type = case trigger_type
    when 'job_completed'        then 'JOB_COMPLETED'
    when 'invoice_paid'         then 'INVOICE_PAID'
    when 'appointment_completed' then 'APPOINTMENT_COMPLETED'
    when 'contact_imported'     then 'CONTACT_IMPORTED'
    when 'manual'               then 'MANUAL'
    when 'lead_won'             then 'JOB_COMPLETED'
    else trigger_type
  end
where trigger_type in
  ('job_completed','invoice_paid','appointment_completed','contact_imported','manual','lead_won');
