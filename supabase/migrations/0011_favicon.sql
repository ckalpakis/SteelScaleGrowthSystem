-- =============================================================================
-- Steel Scale Systems — per-client favicon
-- The image shown in the browser tab / bookmarks for each client's website.
-- =============================================================================

alter table public.client_settings
  add column if not exists favicon_url text;
