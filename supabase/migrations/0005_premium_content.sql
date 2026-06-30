-- =============================================================================
-- Steel City Growth System — premium content sections
-- Optional content that powers the redesigned template's stats, process
-- timeline, testimonials, financing, and FAQ sections. All optional with safe
-- fallbacks, so existing clients keep rendering.
-- =============================================================================

alter table public.client_settings
  add column if not exists stats         jsonb default '[]',  -- [{value,label}]
  add column if not exists process_steps jsonb default '[]',  -- [{title,description}]
  add column if not exists testimonials  jsonb default '[]',  -- [{quote,name,location,rating}]
  add column if not exists financing     jsonb default '[]',  -- [{title,description}]
  add column if not exists faqs          jsonb default '[]';  -- [{question,answer}]

-- -----------------------------------------------------------------------------
-- Enrich the demo client so the redesign showcases fully.
-- -----------------------------------------------------------------------------
update public.client_settings cs
set
  stats = '[
    {"value":"5,000+","label":"Roofs Installed"},
    {"value":"310+","label":"5-Star Reviews"},
    {"value":"25+","label":"Years in Business"},
    {"value":"Lifetime","label":"Workmanship Warranty"}
  ]'::jsonb,
  process_steps = '[
    {"title":"Call or Request a Quote","description":"Reach out and tell us about your roof — it takes two minutes."},
    {"title":"Free Roof Inspection","description":"We assess your roof and explain exactly what is going on, in plain English."},
    {"title":"Clear, Written Estimate","description":"Honest, itemized pricing with financing options and zero pressure."},
    {"title":"Expert Installation","description":"Our certified crews install with premium materials and leave a clean site."},
    {"title":"Guaranteed Results","description":"Every job is backed by our workmanship warranty and a final walkthrough."}
  ]'::jsonb,
  testimonials = '[
    {"quote":"They replaced our roof in a single day and the crew was incredibly professional. The whole process was smooth from estimate to cleanup.","name":"Jennifer M.","location":"Mt. Lebanon, PA","rating":5},
    {"quote":"Best contractor experience we have had. Honest pricing, no pressure, and the new roof looks fantastic. Highly recommend.","name":"David R.","location":"Wexford, PA","rating":5},
    {"quote":"Storm took half our shingles and they had us fixed within 48 hours. Fair price and great communication the entire time.","name":"Sarah K.","location":"Cranberry Twp, PA","rating":5}
  ]'::jsonb,
  financing = '[
    {"title":"0% Interest Options","description":"Qualified homeowners can finance their roof with no interest for an introductory period."},
    {"title":"Flexible Monthly Plans","description":"Affordable monthly payments that fit your budget, not the other way around."},
    {"title":"Fast Approval","description":"Quick, simple application with a decision in minutes — no impact to start."}
  ]'::jsonb,
  faqs = '[
    {"question":"How long does a roof replacement take?","answer":"Most residential roofs are completed in a single day. Larger or more complex roofs may take two."},
    {"question":"Do you offer free inspections?","answer":"Yes. Every estimate starts with a free, no-obligation roof inspection."},
    {"question":"Are you licensed and insured?","answer":"Absolutely. We are fully licensed, insured, and manufacturer-certified for your protection."},
    {"question":"Do you help with insurance claims?","answer":"Yes — we work directly with your insurance company to make storm-damage claims painless."}
  ]'::jsonb
from public.clients c
where cs.client_id = c.id and c.slug = 'demo';
