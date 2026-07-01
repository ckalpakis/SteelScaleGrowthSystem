-- =============================================================================
-- Steel Scale Systems — lead estimate value
-- Lets clients attach a dollar value to each lead so the dashboard can show
-- won revenue and open pipeline value (GoHighLevel-style "Opportunity Value").
-- =============================================================================

alter table public.leads
  add column if not exists estimate_value numeric;
