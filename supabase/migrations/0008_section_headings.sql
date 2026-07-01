-- =============================================================================
-- Steel City Growth System — customizable section headings
-- Lets the same template serve any niche (roofing, HVAC, paving, etc.) by
-- editing the homepage "Our Work" and "Services" headings per client.
-- Wrap a word in *asterisks* to accent it in the brand color, e.g.
--   "See The Difference In Every *Shingle*"
-- =============================================================================

alter table public.client_settings
  add column if not exists work_heading text,
  add column if not exists services_heading text,
  add column if not exists services_subheading text;
