-- =============================================================================
-- Steel Scale Systems — client plan tier (agency-admin controlled)
-- Tier gates paid features. Tier 1 = Starter (no automated review requests);
-- Tier 2 = Growth and Tier 3 = Pro (automated email + text review requests).
-- Only agency admins can change this (it's edited via the service-role client).
-- =============================================================================

alter table public.clients
  add column if not exists tier smallint not null default 1
    check (tier in (1, 2, 3));
