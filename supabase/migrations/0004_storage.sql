-- =============================================================================
-- Steel City Growth System — image storage
-- Public bucket for client website images (logo, hero, gallery, service photos).
-- Uploads go through a server route using the service-role key, so no extra
-- Storage RLS policies are needed; public read is enabled for the website.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('client-media', 'client-media', true)
on conflict (id) do nothing;
