# Steel Scale Review System — Complete Setup Guide (START HERE)

This is the single, end‑to‑end guide: from a fresh deployment to a live client
receiving automated review‑request texts. It links to deeper reference docs where
useful, but you can follow this top to bottom.

**Two phases:**
- **Phase A — Platform setup** (once): configure the app, GHL connection, snapshot.
- **Phase B — Onboard a client** (repeat per client): invite → form → provision →
  two manual GHL steps → wire the webhook → test → live.

---

## 0. How it works (the mental model)

```
Client fills your form  →  your app provisions a GHL sub-account
                              (creates the sub-account via API)
        You (manually in GHL):  load the review snapshot + set custom values
        Your app:               generates a per-client webhook secret
   Wire GHL review workflow → Custom Webhook → your app → your Twilio → customer
```

Key facts:
- **GHL is the trigger; your app + your Twilio send the text.** The review
  workflow calls a webhook on your app at each stage; your app looks up the
  business/review link from its own record and sends via Twilio.
- **Automated:** creating the sub‑account, generating the webhook credential,
  health checks, status tracking.
- **Manual (by design, because GHL's public API can't do these on your plan):**
  loading the snapshot, and setting custom values. The dashboard hands you a
  checklist and a "mark done" button for each.

---

# PHASE A — Platform setup (do once)

## A1. Supabase

1. Create a Supabase project (or use your existing one).
2. Apply the migrations in `supabase/migrations/` in order — you need at least
   `0029`–`0032` for onboarding/provisioning (they create the invitations,
   client accounts, GHL connection, locations, provisioning, admin tasks,
   webhook credentials, and audit tables).
3. Grab these from **Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server‑only secret)

## A2. Environment variables

Set these in Vercel (**Project → Settings → Environment Variables**). See
`.env.example` for the full annotated list.

| Group | Variables |
| --- | --- |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Admins | `AGENCY_ADMIN_EMAILS` (comma‑separated — your login must be here) |
| App URL | `NEXT_PUBLIC_APP_URL` (e.g. `https://steelscale.xyz`) |
| Secrets at rest | `CREDENTIALS_ENCRYPTION_KEY` (`openssl rand -hex 32`) |
| Cron | `CRON_SECRET` (any long random string) |
| Messaging (Twilio) | `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_SECRET`, `TWILIO_MESSAGING_SERVICE_SID` |
| GHL connection | `GHL_AUTH_METHOD`, `GHL_COMPANY_ID`, and the auth vars from A4 |
| GHL snapshot | `GHL_REVIEW_SNAPSHOT_NAME` (and `GHL_REVIEW_SNAPSHOT_ID` if you have it) |
| Custom values | `GHL_AUTOMATE_CUSTOM_VALUES=false` (manual — the default) |

## A3. Twilio

1. In Twilio, create an **API Key** (SID + Secret) and a **Messaging Service**,
   and add a sending number to it.
2. Set `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_SECRET`,
   `TWILIO_MESSAGING_SERVICE_SID`.

> All clients' review texts send from this one Messaging Service. (You don't need
> LC Phone for sending — see `docs/ghl-setup-guide.md §7` if you want per‑client
> reply numbers.)

## A4. Connect GHL (authentication)

Because the snapshot and custom values are **manual**, the app's only GHL API job
is to **create/read the sub‑account** — which needs just two agency scopes:
`locations.readonly` and `locations.write`.

Pick the simplest method that works for you:

- **Private Integration Token (try first — easiest).** If your agency Private
  Integration can be granted `locations.readonly` + `locations.write`, use it.
  Set `GHL_AUTH_METHOD=private_integration` and `GHL_PRIVATE_INTEGRATION_TOKEN`.
  Full steps: `docs/ghl-private-integration-setup.md`.
- **OAuth Marketplace app (if PIT can't create sub‑accounts).** Set
  `GHL_AUTH_METHOD=oauth` and the client/token vars. Full steps:
  `docs/ghl-marketplace-app-setup.md`.

Also set `GHL_COMPANY_ID` (your agency ID: **Agency Settings → Company** in GHL)
and, recommended, `GHL_GRANTED_SCOPES=locations.readonly locations.write`.

> Reference: `docs/ghl-authentication-setup.md` explains the auth model and every
> env var. You only need the **location** scopes now — custom‑value scopes aren't
> required in manual mode.

## A5. Activate the GHL connection row  ⚠️ don't skip

Provisioning refuses to run until there's an **active** `ghl_connections` row (a
safety gate). The tokens live in your env vars; this row just marks the
connection live. Run this once in **Supabase → SQL Editor**:

```sql
insert into public.ghl_connections
  (ghl_company_id, authentication_type, scopes, status)
values
  ('YOUR_AGENCY_COMPANY_ID',
   'private_integration',                       -- or 'oauth'
   array['locations.readonly','locations.write'],
   'active');
```

(There can be only one active row. To rotate later, set the old one's `status`
to `inactive` before inserting a new active one.)

## A6. Build the review snapshot in GHL

Create the snapshot every sub‑account is built from. It must contain (a) the
review **workflow** (4 stages) and (b) the **custom values** you'll fill in.
Full details, including the exact custom‑value key names: **`docs/ghl-setup-guide.md`
Part A**. Put the snapshot's name in `GHL_REVIEW_SNAPSHOT_NAME`.

## A7. Deploy

Redeploy so all env vars take effect. Platform setup is done.

---

# PHASE B — Onboard a client (repeat for each client)

All admin screens live under **Dashboard → Onboarding** (you must be signed in
as an `AGENCY_ADMIN_EMAILS` user).

## B1. Create the invitation

1. **Onboarding → Manage invitations** (`/dashboard/onboarding/invitations`).
2. Enter the client's email, click **Create invitation**.
3. **Copy the link now** — shown once. Send it to the client.

## B2. Client fills in Business setup

They open `/onboard/<token>` (no login) and complete the 6‑step form (business,
location, Google review link, logo + color, review settings, review & submit).
On submit, a provisioning run is queued.

## B3. Provisioning creates the sub‑account (automatic)

Open the client at **Onboarding → (client)** and watch the timeline. It runs
`validate → create location → …`. On Vercel Hobby the daily cron drives it, so to
run it now click **Retry provisioning**. When it needs you, it parks at
**Needs action** with a task (next two steps).

## B4. Load the review snapshot (manual)

Task: **"Load Steel Scale review snapshot."**
1. GHL → **Agency View → Account Snapshots**.
2. Push your review snapshot to this client's location (the task shows the
   Location ID).
3. Back in the dashboard, click **Mark snapshot complete**.

## B5. Set the custom values (manual)

Task: **"Set review custom values in GHL"** — it lists every key and the exact
value.
1. In the sub‑account → **Settings → Custom Values**.
2. Set each value from the checklist (business name, review link, logo URL,
   follow‑up count → `service_type`, ask‑for‑referral → `Yes`/`No`, etc.).
3. Back in the dashboard, click **Mark custom values done**.

Provisioning resumes, creates the webhook credential, runs health checks, and the
client becomes **Active**.

## B6. Wire the review workflow webhook

Open **(client) → Webhook setup** (`/dashboard/onboarding/clients/<id>/webhook`).
It gives you the URL, headers, a one‑time secret, and four JSON payloads. In the
sub‑account's review workflow, for each of the 4 stages, replace the **Send SMS**
action with a **Custom Webhook (POST)** using:
- URL: `https://<YOUR_APP_DOMAIN>/api/workflow/review`
- Headers: `Content-Type: application/json` and `X-SteelScale-Webhook-Secret: <secret>`
- Body: that stage's JSON (copy from the page)

Full walkthrough with the merge‑field reference: **`docs/ghl-setup-guide.md` Part 6**.

## B7. Test, then go live

On the Webhook setup page:
- **Test Configuration** — dry run (no SMS); fix any ❌.
- **Send a real test** — optional, to a number you own and opted in.
Then **publish** the GHL workflow. Done — that client is live.

---

## What's automatic vs manual (summary)

| Task | How |
| --- | --- |
| Create the sub‑account | ✅ Automatic (API) |
| Generate webhook credential | ✅ Automatic |
| Health checks / status | ✅ Automatic |
| Load snapshot | ✍️ Manual in GHL → Mark complete |
| Set custom values | ✍️ Manual in GHL → Mark done |
| Wire the 4 workflow webhooks | ✍️ Manual in GHL (paste from dashboard) |

## Day‑to‑day admin actions (client detail page)

**Retry provisioning**, **Mark snapshot complete**, **Mark custom values done**,
**Regenerate webhook secret**, **Edit configuration**, **Pause**, **Open GHL
sub‑account**.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Provisioning fails at **validate** (`no_active_connection`) | Do step **A5** (insert the active `ghl_connections` row) |
| Fails at **create location** (401/scope) | Your GHL token can't create sub‑accounts — check `locations.write`; switch PIT→OAuth (A4) |
| Stuck at **Needs action** | Do the listed manual task (B4/B5), then it resumes |
| Webhook returns **401** | Rotate the secret on the Webhook setup page and re‑paste it in GHL |
| Webhook **503 not configured** | Set the four `TWILIO_*` vars |
| Newly submitted client not moving | Click **Retry provisioning** (Hobby cron runs once daily) |

---

## Reference docs (deeper dives)

| Doc | Covers |
| --- | --- |
| `docs/ghl-authentication-setup.md` | GHL auth model, scopes, all env vars |
| `docs/ghl-private-integration-setup.md` | Create the PIT (easiest auth) |
| `docs/ghl-marketplace-app-setup.md` | Create the OAuth app (if PIT can't) |
| `docs/ghl-setup-guide.md` | GHL‑side: snapshot + custom‑value keys + the workflow webhook |
| `docs/onboarding-system-guide.md` | The dashboard/onboarding flow in detail |
