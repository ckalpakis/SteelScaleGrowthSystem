-- =============================================================================
-- Steel City Growth System — custom domains
-- Lets each client serve their site on their own domain (or a subdomain of the
-- agency root). The middleware maps an incoming hostname to a client slug.
-- =============================================================================

alter table public.clients
  add column if not exists domain text;

-- One domain maps to at most one client.
create unique index if not exists clients_domain_key
  on public.clients (lower(domain))
  where domain is not null;

-- Example: point a client's custom domain at their tenant.
--   update public.clients set domain = 'bluebuiltroofs.com' where slug = 'bluebuilt';
-- Subdomains of the agency root (e.g. bluebuilt.steelscale.xyz) need no domain
-- value — the middleware uses the subdomain label as the slug automatically.
