-- =============================================================================
-- Steel Scale Systems — remove the demo tenant
-- The landing page no longer links to a demo site. This deletes the seeded
-- 'demo' client so /site/demo returns 404. Related client_settings, leads, and
-- lead_notes are removed automatically via ON DELETE CASCADE.
-- Safe to run more than once (no-op if the demo client is already gone).
-- =============================================================================

delete from public.clients where slug = 'demo';
