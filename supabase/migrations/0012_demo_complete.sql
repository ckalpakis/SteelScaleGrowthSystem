-- =============================================================================
-- Steel Scale Systems — finish the demo site
-- Fills in a logo + favicon (self-contained SVG data URIs, so they always
-- render) and the remaining content sections (stats, process, reviews, FAQs)
-- so /site/demo looks like a fully completed website out of the box.
-- Re-runnable: it only updates the seeded 'demo' client.
-- =============================================================================

update public.client_settings cs
set
  logo_url    = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMDAgMjAwIj4KICA8IS0tIGhvdXNlIGVtYmxlbSwgY2VudGVyZWQgLS0+CiAgPHBvbHlnb24gcG9pbnRzPSIxNTAsMjQgMjEwLDc0IDkwLDc0IiBmaWxsPSIjYjkxYzFjIi8+CiAgPHJlY3QgeD0iMTA4IiB5PSI3NCIgd2lkdGg9Ijg0IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjMGMyMzQwIi8+CiAgPHJlY3QgeD0iMTM5IiB5PSI5MiIgd2lkdGg9IjIyIiBoZWlnaHQ9IjMwIiBmaWxsPSIjZmZmZmZmIi8+CiAgPHJlY3QgeD0iMTE4IiB5PSI4MiIgd2lkdGg9IjE0IiBoZWlnaHQ9IjE0IiBmaWxsPSIjZmZmZmZmIi8+CiAgPHJlY3QgeD0iMTY4IiB5PSI4MiIgd2lkdGg9IjE0IiBoZWlnaHQ9IjE0IiBmaWxsPSIjZmZmZmZmIi8+CiAgPCEtLSB3b3JkbWFyayAtLT4KICA8dGV4dCB4PSIxNTAiIHk9IjE1MiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBIZWx2ZXRpY2EsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzYiIGZvbnQtd2VpZ2h0PSI4MDAiIGZpbGw9IiMwYzIzNDAiIGxldHRlci1zcGFjaW5nPSIxLjUiPlNURUVMIENJVFk8L3RleHQ+CiAgPHJlY3QgeD0iMTA0IiB5PSIxNjIiIHdpZHRoPSI5MiIgaGVpZ2h0PSIzIiBmaWxsPSIjYjkxYzFjIi8+CiAgPHRleHQgeD0iMTUwIiB5PSIxODUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgSGVsdmV0aWNhLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE1IiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSIjYjkxYzFjIiBsZXR0ZXItc3BhY2luZz0iNCI+Uk9PRklORyAmYW1wOyBFWFRFUklPUlM8L3RleHQ+Cjwvc3ZnPgo=',
  favicon_url = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+CiAgPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTMiIGZpbGw9IiNiOTFjMWMiLz4KICA8cGF0aCBkPSJNMzIgMTMgTDU1IDM0IEw0OCAzNCBMNDggNTEgTDE2IDUxIEwxNiAzNCBMOSAzNCBaIiBmaWxsPSIjZmZmZmZmIi8+CiAgPHJlY3QgeD0iMjciIHk9IjM5IiB3aWR0aD0iMTAiIGhlaWdodD0iMTIiIGZpbGw9IiNiOTFjMWMiLz4KPC9zdmc+Cg==',
  stats = '[
    {"value":"20+","label":"Years in Business"},
    {"value":"2,500+","label":"Roofs Installed"},
    {"value":"4.9★","label":"Average Rating"},
    {"value":"100%","label":"Satisfaction Guarantee"}
  ]'::jsonb,
  process_steps = '[
    {"title":"Free Inspection","description":"We assess your roof and exterior and explain exactly what''s going on — in plain English."},
    {"title":"Clear Written Estimate","description":"Honest, upfront pricing with no surprises and no high-pressure sales."},
    {"title":"Professional Installation","description":"Our skilled, in-house crews get to work with premium materials and a spotless job site."},
    {"title":"Final Walkthrough & Warranty","description":"We walk the finished job with you and back it with a workmanship warranty."}
  ]'::jsonb,
  testimonials = '[
    {"quote":"Steel City replaced our whole roof after a bad storm and made it painless. Fair price, spotless cleanup, and done in two days.","name":"Karen M.","location":"Mt. Lebanon, PA","rating":5},
    {"quote":"Honest and professional from the estimate to the final walkthrough. They found the real cause of our leak when two other companies missed it.","name":"Dave R.","location":"Wexford, PA","rating":5},
    {"quote":"Our new siding and gutters look incredible. The crew was respectful and cleaned up every single day. Highly recommend to any Pittsburgh homeowner.","name":"Priya S.","location":"Cranberry Township, PA","rating":5},
    {"quote":"Great communication the entire time. You can tell they take real pride in their work — our home has never looked better.","name":"Tom B.","location":"Bethel Park, PA","rating":5}
  ]'::jsonb,
  faqs = '[
    {"question":"How much does a new roof cost in Pittsburgh?","answer":"Every home is different, but most residential roof replacements fall between $8,000 and $20,000 depending on size, pitch, and materials. We provide a free, no-pressure estimate with clear written pricing."},
    {"question":"Do you offer free inspections and estimates?","answer":"Yes. We provide a free, thorough inspection and a detailed written estimate before any work begins — with no obligation."},
    {"question":"Are you licensed and insured?","answer":"Absolutely. Steel City Roofing & Exteriors is fully licensed and insured, and all of our work is backed by a workmanship warranty."},
    {"question":"How long does a roof replacement take?","answer":"Most homes are completed in one to three days depending on size and weather. We give you a clear timeline up front and keep the job site clean throughout."},
    {"question":"Do you help with storm damage insurance claims?","answer":"Yes. We are experienced with storm and hail damage claims and can walk you through the process and meet your adjuster on site."}
  ]'::jsonb
from public.clients c
where cs.client_id = c.id and c.slug = 'demo';
