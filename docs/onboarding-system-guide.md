# Client Onboarding & Provisioning — Operator Guide

> **Looking for the full start‑to‑finish setup?** See
> **`docs/COMPLETE-SETUP-GUIDE.md`** — it covers platform setup (Supabase, env,
> GHL connection, snapshot) plus this onboarding flow, end to end. This doc is
> the detailed operator reference for the onboarding/provisioning part.

How to onboard a new client from start to finish using the system in this repo:
invite → the client fills the **Business setup** form → automatic provisioning of
their Steel Scale sub‑account → load the review snapshot → wire the review
workflow webhook → test → go live.

Everything here is **admin‑only** and lives under `/dashboard/onboarding`. You
must be signed in with an email listed in `AGENCY_ADMIN_EMAILS`.

---

## 0. One‑time setup (once per environment)

Set these environment variables (see `.env.example` for the full list):

| Purpose | Variables |
| --- | --- |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Admins | `AGENCY_ADMIN_EMAILS` (comma‑separated) |
| App URL | `NEXT_PUBLIC_APP_URL` (e.g. `https://app.steelscale.xyz`) |
| GHL agency | `GHL_AUTH_METHOD`, `GHL_COMPANY_ID`, and the OAuth **or** PIT vars — see `docs/ghl-authentication-setup.md` |
| Snapshot | `GHL_REVIEW_SNAPSHOT_NAME` (and `GHL_REVIEW_SNAPSHOT_ID` if you have it) |
| Messaging | `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_SECRET`, `TWILIO_MESSAGING_SERVICE_SID` |
| Secrets at rest | `CREDENTIALS_ENCRYPTION_KEY` (32 bytes, e.g. `openssl rand -hex 32`) |
| Cron | `CRON_SECRET` |

Then apply the database migrations (`supabase/migrations/0029`–`0032`) to your
Supabase project.

---

## 1. Create an invitation

1. Go to **Dashboard → Onboarding → Manage invitations**
   (`/dashboard/onboarding/invitations`).
2. Enter the client's email (optional) and click **Create invitation**.
3. **Copy the link immediately** — it is shown **once** and never again. Only a
   hash is stored, so it cannot be recovered. Send it to the client.

Invitation rules:
- Links expire after `ONBOARDING_INVITATION_TTL_DAYS` (default 14).
- **Revoke** stops a link working immediately.
- **Resend** generates a brand‑new link (and revokes the old one) — allowed until
  the client has submitted.
- The list shows **Not opened → Opened → Completed** (plus Expired / Revoked).

---

## 2. The client fills in Business setup

The client opens `/onboard/<token>` (no login) and completes a 6‑step,
mobile‑first form:

1. **Business** — name, legal name, owner, email, phone, website
2. **Location** — address, city/state/postal, country, time zone
3. **Google reviews** — their Google review link
4. **Branding** — logo (PNG/JPEG/WebP) + optional brand color
5. **Review settings** — requests per 14 days, follow‑ups (0–3), ask‑for‑referral
6. **Review & submit** — confirm and finish

On submit they see a generic success screen and a **provisioning run is queued**.
The client never waits on any provider calls.

---

## 3. Provisioning runs automatically

A background worker configures the client's sub‑account through nine steps:

`validate → create location → location token → apply snapshot → discover custom
values → update custom values → create webhook credential → health checks →
finalize`.

**When does it run?**
- Automatically on the daily cron (it piggybacks on `/api/cron/review-engine`).
- Immediately when you click **Retry provisioning** on the client detail page.
- Or via an external scheduler hitting `POST /api/cron/provisioning` with header
  `Authorization: Bearer <CRON_SECRET>` (useful on Vercel Hobby, where crons only
  run once a day).

Watch progress at **Onboarding → (client)**
(`/dashboard/onboarding/clients/<id>`): the **Provisioning timeline** shows each
step's status, and the **GHL** panel shows the location ID, snapshot status, and
custom‑values status.

### Status colors
- 🟢 **Active** — fully provisioned
- 🟡 **Needs action** — a manual step is required (see below)
- 🔴 **Failed** — an error stopped the run (retry after fixing)
- ⚪ **Provisioning / running / queued** — in progress

---

## 4. Load the review snapshot (manual step)

HighLevel has no public API to push a snapshot, so provisioning **parks at
Needs action** with an admin task titled **"Load Steel Scale review snapshot."**

1. Open the task on the client detail page (it lists the location ID and snapshot
   name).
2. In GHL **Agency View → Account Snapshots**, push the snapshot to that location.
3. Back in the dashboard, click **Mark snapshot complete**.

This resumes provisioning, which then parks again for the custom‑value step
(next).

## 5. Set the review custom values (manual step)

By default the system does **not** write custom values through the API (GHL only
grants `customValues.write` via a sub‑account token some plans don't offer). So
after the snapshot, provisioning parks at **Needs action** with a task titled
**"Set review custom values in GHL"** that lists every value to enter.

1. Open the task on the client detail page — it lists each custom‑value key and
   the exact value to set (business name, review link, logo URL, follow‑up count,
   etc.).
2. In the sub‑account, go to **Settings → Custom Values** and set each one.
3. Back in the dashboard, click **Mark custom values done**.

That resumes provisioning, which creates the webhook credential and finishes.

> **Advanced:** if your OAuth app + location tokens *can* write custom values,
> set `GHL_AUTOMATE_CUSTOM_VALUES=true` to have the engine discover, write, and
> verify them automatically (and, if one can't be matched, raise a "Missing
> required custom values" task instead).

---

## 6. Wire the review workflow webhook

Once the client is **Active**, open **(client) → Webhook setup**
(`/dashboard/onboarding/clients/<id>/webhook`).

The page gives you everything to paste into GHL:
- **Webhook URL**, **method** (`POST`), **content type** (`application/json`)
- **Header:** `X-SteelScale-Webhook-Secret`
- **One‑time secret** — click **Generate/Rotate secret** and copy it now; it is
  never shown again
- **Four payloads** — one per workflow stage (initial + follow‑up 1/2/3)

Then, in the client's GHL sub‑account, for each review workflow message:
1. Automation → open the review workflow
2. Replace the **Send SMS** action with a **Custom Webhook** (POST)
3. Paste the URL, add the `Content-Type` and `X-SteelScale-Webhook-Secret`
   headers, and paste that stage's JSON
4. Save

> The payloads only send **contact + location identifiers**. Steel Scale looks up
> the business name, logo, and review link from **its own record** using the
> authenticated location ID — never from values GHL sends.

---

## 7. Test, then activate

On the same Webhook setup page:

- **Test Configuration** — a dry run (no SMS) that checks the secret, location
  match, merge fields, active status, review link, and messaging config, and
  returns a checklist.
- **Send a real test** — optional, admin‑only. Enter a phone number **you** own
  and have opted in, confirm the checkbox, and send one real message.

Activate the GHL workflow only after a successful test.

---

## 8. Day‑to‑day actions (client detail page)

| Action | What it does |
| --- | --- |
| **Retry provisioning** | Re‑runs from the first incomplete step (safe/idempotent) |
| **Re‑run value sync** | Re‑discovers and re‑writes the custom values |
| **Mark snapshot complete** | Clears the manual snapshot gate and resumes |
| **Mark custom values done** | Confirms you set the values in GHL by hand and resumes |
| **Regenerate webhook secret** | Rotates the secret (old one stops working — reinstall in GHL) |
| **Edit configuration** | Correct business info / review settings |
| **Pause** | Stops provisioning and sends for that client |
| **Open GHL sub‑account** | Opens the location in GHL (when a location ID exists) |

Every admin action is recorded in the `admin_audit_log` table. Tokens and secret
hashes are never displayed; raw webhook secrets appear only at creation/rotation.

---

## 9. Quick troubleshooting

| Symptom | Fix |
| --- | --- |
| Client stuck at **Needs action** | Open the client, resolve the listed admin task, then Retry |
| **Failed** run | Read the safe error on the timeline, fix the cause (e.g. GHL creds), Retry |
| Onboarding link "no longer available" | It expired, was revoked, or was already used — Resend a new one |
| Newly submitted client not provisioning | Click Retry, or wait for the daily cron / trigger `/api/cron/provisioning` |
| Webhook returns 401 | Secret mismatch — rotate it on the Webhook setup page and reinstall in GHL |
| "Messaging not configured" | Set the four `TWILIO_*` variables |

---

## Related docs
- `docs/ghl-authentication-setup.md` — GHL credentials, scopes, redirect URLs
- `docs/ghl-client-onboarding-plan.md` — the original design
- `.env.example` — every environment variable with inline notes
