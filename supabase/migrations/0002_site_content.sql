-- =============================================================================
-- Steel City Growth System — website content fields
-- Expands client_settings to power the multi-page, conversion + local-SEO
-- optimized public website template (home, services, areas, past work, about,
-- contact). All content is settings-driven so onboarding stays SQL-based.
-- =============================================================================

alter table public.client_settings
  add column if not exists tagline             text,                 -- hero eyebrow, e.g. "Tampa Bay's Epoxy Specialists"
  add column if not exists primary_location    text,                 -- SEO location, e.g. "Marietta, GA"
  add column if not exists hero_image_url      text,                 -- hero background image
  add column if not exists service_areas       text[] default '{}',  -- cities/regions served (per-area pages)
  add column if not exists service_details     jsonb  default '[]',  -- [{slug,name,description,image_url}]
  add column if not exists gallery             jsonb  default '[]',  -- [{url,caption}]
  add column if not exists value_props         text[] default '{}',  -- trust strip items (3)
  add column if not exists badges              text[] default '{}',  -- trust badges, e.g. "Licensed & Insured"
  add column if not exists about_headline      text,
  add column if not exists about_text          text,
  add column if not exists rating              numeric(2,1),         -- e.g. 4.9
  add column if not exists review_count        integer,              -- e.g. 196
  add column if not exists facebook_url        text,
  add column if not exists instagram_url       text,
  add column if not exists google_business_url text,
  add column if not exists promo_text          text,                 -- nav offer, e.g. "Get $350 Off"
  add column if not exists address             text,
  add column if not exists hours               text;

-- -----------------------------------------------------------------------------
-- Enrich the demo client so the template renders fully populated out of the box.
-- -----------------------------------------------------------------------------
update public.client_settings cs
set
  tagline             = 'Pittsburgh''s Trusted Roofing & Exterior Specialists',
  primary_location    = 'Pittsburgh, PA',
  hero_image_url      = 'https://images.unsplash.com/photo-1632759145351-1d592919f522?auto=format&fit=crop&w=1600&q=80',
  service_areas       = array['Pittsburgh','Mt. Lebanon','Cranberry Township','Wexford','Bethel Park','Robinson Township'],
  service_details     = '[
    {"slug":"roof-replacement","name":"Roof Replacement","description":"Full tear-off and replacement using premium architectural shingles built to handle Pittsburgh winters. Backed by a workmanship warranty."},
    {"slug":"roof-repair","name":"Roof Repair","description":"Fast, reliable repairs for leaks, storm damage, and missing shingles. We find the problem and fix it right the first time."},
    {"slug":"gutters","name":"Gutters","description":"Seamless gutter installation and gutter guards that protect your home from water damage year-round."},
    {"slug":"siding","name":"Siding","description":"Durable, great-looking siding that boosts curb appeal and energy efficiency for your home."}
  ]'::jsonb,
  gallery             = '[
    {"url":"https://images.unsplash.com/photo-1635424710928-0544e8512eae?auto=format&fit=crop&w=800&q=80","caption":"Complete roof replacement in Mt. Lebanon"},
    {"url":"https://images.unsplash.com/photo-1632759145351-1d592919f522?auto=format&fit=crop&w=800&q=80","caption":"Architectural shingle install in Wexford"},
    {"url":"https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=800&q=80","caption":"New siding and gutters in Cranberry"}
  ]'::jsonb,
  value_props         = array[
    'Family-owned and operated since 2003',
    'Free estimates with no-pressure, honest pricing',
    'Licensed, insured, and fully warrantied work'
  ],
  badges              = array['Licensed & Insured','BBB Accredited','GAF Certified','5-Star Google Rated'],
  about_headline      = 'Your neighbors trust us with their biggest investment',
  about_text          = 'Steel City Roofing & Exteriors has protected Pittsburgh homes for over 20 years. As a family-owned, local business, we treat every roof like it''s our own — with quality materials, skilled crews, and the kind of honest communication that has earned us hundreds of 5-star reviews. From a small repair to a full replacement, we''re here to make the process simple and stress-free.',
  rating              = 4.9,
  review_count        = 196,
  facebook_url        = 'https://facebook.com',
  instagram_url       = 'https://instagram.com',
  google_business_url = 'https://g.page/r/your-google-review-link',
  promo_text          = 'Free Inspection This Month',
  address             = '123 Steel Ave, Pittsburgh, PA 15201',
  hours               = 'Mon–Sat: 7am–7pm'
from public.clients c
where cs.client_id = c.id and c.slug = 'demo';
