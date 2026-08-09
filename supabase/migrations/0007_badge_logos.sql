-- =============================================================================
-- Steel City Growth System — trust badge logos
-- Real certification / trust logos (images) for the badge strip. When present
-- they render as images; otherwise the text `badges` fall back to seal icons.
-- =============================================================================

alter table public.client_settings
  add column if not exists badge_logos jsonb default '[]';  -- [{url,label}]
