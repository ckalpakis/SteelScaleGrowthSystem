-- =============================================================================
-- Steel City Growth System — customizable secondary (dark) color
-- The dark emphasis bands, footer, and headings use this instead of a fixed
-- navy, so each client can theme it.
-- =============================================================================

alter table public.client_settings
  add column if not exists secondary_color text default '#0c2340';
