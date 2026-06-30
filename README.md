# Steel City Growth System

A reusable **client website + CRM** system for a web design agency. Each client
(a local business) gets a branded marketing site with lead capture, plus a
simple multi-tenant CRM to manage those leads through a pipeline.

Built with **Next.js (App Router) · TypeScript · Tailwind CSS · Supabase · Resend**.

## Features

- **Branded, multi-page public website** per client (`/site/<slug>`) — built for
  conversion and local SEO:
  - Utility bar (call/email + Google rating), sticky nav with Services/Areas
    dropdowns, and a brand-color "Get a Free Quote" CTA
  - Hero with location-based H1 and an **embedded lead form**
  - **Services** page + an auto-generated landing page **per service**
  - **Service Areas** page + an auto-generated local landing page **per city**
  - **Past Work** gallery, **About**, and **Contact** (with map)
  - LocalBusiness JSON-LD structured data + per-page title/meta
  - All content is driven by `client_settings` (see migration `0002`)
- **Lead capture** — contact/quote form saves leads to Supabase.
- **Client login** (Supabase Auth) and a protected dashboard.
- **Lead pipeline** — New → Contacted → Estimate Scheduled → Won → Lost, with
  inline status updates and per-stage filtering.
- **Lead notes** — add/remove notes on any lead.
- **Email notifications** — the business is emailed (via Resend) on every new lead.
- **Review requests** — generate a prefilled Google review message per lead
  (copy or text it).
- **Settings** — business name, phone, email, logo, brand color, Google review
  link, services, and service area.

## Architecture

Multi-tenant by `client_id`. Each business is a row in `clients`; `profiles`
links a Supabase auth user to the client they belong to. Row Level Security
scopes every read/write to the user's own tenant. Public lead capture goes
through a server route (`/api/leads`) using the service-role key, so no public
write access to the database is exposed.

```
src/
  app/
    page.tsx                     Marketing landing for the product
    site/[slug]/                 Public branded client website (multi-page)
      layout.tsx                 Header/footer/brand + JSON-LD per tenant
      page.tsx                   Home (hero + embedded lead form)
      services/                  Services index + [service] SEO landing pages
      areas/                     Areas index + [area] local SEO landing pages
      past-work/ about/ contact/ Gallery, About, Contact (with map)
    login/page.tsx               Client login
    auth/signout/route.ts        Sign out
    api/leads/route.ts           Public lead-capture endpoint
    dashboard/
      layout.tsx                 Authed shell (nav + sign out)
      page.tsx                   Leads list + pipeline filters
      leads/[id]/page.tsx        Lead detail: status, notes, review request
      settings/page.tsx          Client settings
      actions.ts                 Server actions (status, notes, settings)
  components/                    UI primitives, site + dashboard components
  lib/
    supabase/                    Browser / server / admin / middleware clients
    types.ts                     Domain types + pipeline definition
    email.ts                     Resend new-lead notification
    review.ts                    Review-request message builder
    auth.ts                      requireClient() helper
supabase/schema.sql              Tables, RLS policies, demo seed
```

## Setup

1. **Install**

   ```bash
   npm install
   ```

2. **Supabase** — create a project, then run `supabase/schema.sql` in the SQL
   editor. This creates the tables, RLS policies, and seeds a `demo` client.

3. **Environment** — copy `.env.example` to `.env.local` and fill in:

   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   RESEND_API_KEY
   LEAD_NOTIFICATION_FROM
   ```

4. **Create a client login** — in Supabase Auth, add a user. Then link it to a
   client:

   ```sql
   insert into profiles (id, client_id, full_name)
   values ('<auth-user-id>', (select id from clients where slug = 'demo'), 'Owner');
   ```

5. **Run**

   ```bash
   npm run dev
   ```

   - Public site: `http://localhost:3000/site/demo`
   - Dashboard: `http://localhost:3000/login`

## Custom domains (clients on their own URL)

Each client's site can be served on their own domain or a subdomain of your
agency root — clean URLs, no `/site/<slug>` showing. Set `ROOT_DOMAIN` to enable
it (e.g. `steelscale.xyz`); the middleware maps the incoming hostname to a client.

**Subdomain (simplest):** add a wildcard `*.{ROOT_DOMAIN}` DNS record pointing at
your host. Then `bluebuilt.steelscale.xyz` automatically serves the client whose
`slug` is `bluebuilt` — no per-client config needed.

**Client's own domain:**
1. `update clients set domain = 'bluebuiltroofs.com' where slug = 'bluebuilt';`
2. Add `bluebuiltroofs.com` (and `www`) in your host's Domains settings (Vercel).
3. At the client's registrar, point the domain at your host (apex `A` record /
   `www` `CNAME` per the host's instructions). SSL is issued automatically.

Local testing: `bluebuilt.localhost:3000` resolves to the `bluebuilt` tenant.

## Onboarding a new client

1. Insert a row into `clients` (set a unique `slug`).
2. Create their Supabase auth user and add a `profiles` row linking them to the
   new client.
3. Send them to `/site/<slug>` (their website) and `/login` (their dashboard).

That's the whole playbook — reusable for every business you sell to.
