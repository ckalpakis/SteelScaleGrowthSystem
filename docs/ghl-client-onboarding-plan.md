# GHL Client Onboarding & Provisioning — Design Plan

**Status:** Design only. No production code is changed by this document.
**Scope:** Easy client onboarding + automatic provisioning of a GoHighLevel (GHL)
sub-account under the Steel Scale agency. Everything operational (CRM, review
workflows, funnels, review responses, social, email, review filtering) stays
**inside GHL**. This feature only: collects business info, creates the GHL
location, populates the review-snapshot custom values, and issues a per-client
webhook credential for the existing Twilio SMS endpoint.

Out of scope (explicitly): Google OAuth, client reporting, rebuilding Twilio
sending, billing, a large dashboard, and any client-facing GHL login.

---

## 1. Current repository assessment

### 1.1 Framework, runtime, package versions
- **Next.js 14.2.15**, App Router. **React 18.3**, **TypeScript 5.6**.
- **Node serverless on Vercel** (route handlers + server actions). `maxDuration`
  is set per-route where long work happens (e.g. `/api/review` = 15s).
- Key deps already present and reusable: `@supabase/ssr` + `@supabase/supabase-js`,
  `zod` (^4), `twilio` (^6), `libphonenumber-js`, `resend`, `@vercel/analytics`.
- Tailwind 3.4. ESLint (`next lint`). **Vitest 4** (`npm test`).

### 1.2 Routing structure
- API: `src/app/api/**/route.ts` (e.g. `api/review`, `api/upload`, `api/leads`,
  `api/cron/*`, `api/integrations/google/*`).
- Admin app: `src/app/dashboard/**` — server components + colocated
  `actions.ts` server actions; admin-only areas call `requireAgencyAdmin()`.
- Public tenant sites: `src/app/site/[slug]/**` (Steel Scale website-builder
  product — see legacy notes).
- Public utility routes: `src/app/r/[code]` (review-link redirector),
  `src/app/privacy`, `src/app/terms`.

### 1.3 Authentication system
- **Supabase Auth** via `@supabase/ssr` cookie sessions.
  `src/lib/supabase/server.ts` → RLS-scoped session client;
  `src/lib/supabase/admin.ts` → `createAdminClient()` (service role, bypasses RLS).
- **Admin identity = email allowlist**: `AGENCY_ADMIN_EMAILS` env →
  `isAgencyAdmin(email)` / `requireAgencyAdmin()` in `src/lib/auth.ts`.
  There is **no role table** beyond `profiles.role` (`member|owner`).
- Clients (tenants) are linked to auth users via `profiles.client_id`.
  **GHL onboarding clients will have no auth user and no profile** — they never
  log in, matching the business requirement.

### 1.4 Supabase / database setup
- Migrations live in `supabase/migrations/00xx_*.sql` (currently up to `0028`).
- Heavy RLS. Helper SECURITY DEFINER functions `current_client_id()` /
  `current_company_id()`; shared `set_updated_at()` trigger.
- Two established access patterns:
  1. **RLS session client** for tenant-scoped reads/writes.
  2. **Service-role admin client** for public/anonymous writes (`api/leads`,
     `api/upload`) and for admin server components that read across tenants
     (e.g. the developer console). Secret-holding tables use *RLS on + no
     authenticated policy* (service-role only).

### 1.5 Existing client / business tables
- `clients` (`id`, `name`, `slug` unique, `domain`) — the tenant anchor; `slug`
  and `domain` are **website-builder** concepts.
- `client_settings` (1:1) — `business_name`, `phone`, `email`, `logo_url`,
  `brand_color`, `google_review_link`, `services[]`, hero copy, etc. (website
  branding).
- `profiles` — auth-user ↔ client link.
- `companies` (1:1 with `clients`, migration `0016`) — anchor for the **Reputation
  module** (Steel-Scale-native review automation).
- `clients.tier` (`0014`) gates the native review automation.

### 1.6 Existing Twilio webhook endpoint (do not rebuild)
- **`POST /api/review`** already exists and is production-quality:
  `src/app/api/review/route.ts` → `src/lib/review/**` (controller, validation,
  messageBuilder, `services/twilioService.ts`, `security/*`).
- Sends via Twilio **Messaging Service SID** (SDK, API-key auth). Handles
  SMS/MMS, validation (zod), phone normalization (libphonenumber-js), clean
  status codes. **This is the endpoint the client's GHL workflows will call.**

### 1.7 Existing webhook-secret model (a gap to close)
- Today `/api/review` verifies a **single global secret**
  `STEELSCALE_WEBHOOK_SECRET` via `x-steelscale-secret`
  (`src/lib/review/security/secret.ts`, timing-safe, fail-closed) plus per-IP
  rate limiting and body-size limits.
- **This feature requires per-client credentials.** That means extending the
  secret verification to look up a client's secret by a public key/header —
  see §8 (Custom-value/credential strategy) and §11 (Security). The change is
  additive and can remain backward-compatible with the global secret.

### 1.8 Existing storage system for logos
- Supabase Storage **public bucket `client-media`** (migration `0004`).
- Upload route `POST /api/upload` (service role) — **requires a signed-in user**
  and writes to `<client_id>/<kind>-<ts>.ext`, 5 MB cap, images only.
- Onboarding is **anonymous**, so we need a **token-gated** upload path (reuse
  the same bucket, path `onboarding/<token>/logo-<ts>.ext`).

### 1.9 Existing forms & UI component library
- Base kit `src/components/ui` (`Button`, `Input`, `Label`, `Textarea`, `Card`,
  `CardBody`, `Badge`, `cn`). Forms use React server actions
  (`useFormState`/`useFormStatus`) — see `NewClientForm`.
- A richer internal kit exists under `src/components/dashboard/reputation/*`
  (`Panel`, `Modal`, `Toast`, `ConfirmDialog`, `Skeleton`, `Tooltip`) — usable
  for the **admin** provisioning screen, not the public form.
- The **public onboarding form** should be mobile-first and dependency-light
  (base `ui` kit only).

### 1.10 Environment-variable validation
- **No central env validator.** Each feature reads `process.env` directly.
- The established good pattern is a **fail-fast loader** that throws a typed
  `ConfigurationError`: `src/lib/review/config/env.ts` (`loadTwilioConfig()`,
  memoized) and `src/lib/google/oauth.ts` (`googleOAuthConfig()`/`configured()`).
- **Follow this pattern** with a `loadGhlConfig()` loader for the new feature.

### 1.11 Existing admin permissions
- Email allowlist only (`AGENCY_ADMIN_EMAILS` → `requireAgencyAdmin`). All admin
  onboarding routes/actions must call `requireAgencyAdmin()`. Provisioning
  actions that touch GHL must re-assert it server-side.

### 1.12 Test framework
- **Vitest** (`npm test` = `vitest run`), node env, `@ → src` alias
  (`vitest.config.ts`), tests colocated as `*.test.ts` under `src`. Existing
  examples in `src/lib/review/**`.

### 1.13 Deployment environment
- **Vercel** (Next 14 serverless). Cron via `vercel.json` (note: Hobby = daily
  only). Env vars in Vercel project settings. Outbound HTTPS allowed (Twilio,
  Google, Resend already call out). Encryption key `CREDENTIALS_ENCRYPTION_KEY`
  + AES-256-GCM helpers in `src/lib/crypto.ts` are reusable for GHL tokens and
  per-client secrets.

### 1.14 Legacy fields / features that conflict with the GHL-based architecture
> These are **parallel, Steel-Scale-native** systems that duplicate what GHL now
> owns. The onboarding feature must **not** wire into them.

- **Website-builder** (`clients.slug/domain`, `client_settings.*`, `site/[slug]`,
  the `client-media` per-client folders): a different product. GHL-only clients
  don't need a slug, a website, hero copy, or `service_area`.
- **Reputation module** (`companies`, `review_contacts`, `review_workflows`,
  `review_requests`, `review_engine`, `conversations`, `review_settings`,
  `integrations_schema`, CRM adapters, the event bus/listener): native review
  automation. **GHL owns review workflows now**, so this feature does not feed
  the native engine.
- **`clients.tier`** gating: irrelevant to GHL onboarding.
- **`STEELSCALE_WEBHOOK_SECRET` (single global)**: conflicts with the
  per-client credential requirement (see §1.7 / §8 / §11).
- Field-name overlaps that are *coincidental, not shared*:
  `client_settings.google_review_link` / `logo_url` / `business_name` look like
  the onboarding fields but belong to the website product. **Do not reuse
  `client_settings` for GHL onboarding data** — keep a clean, dedicated schema.

**Recommendation:** Treat GHL onboarding as a **standalone domain** with its own
tables (§2). Optionally link a `clients` row as the human-friendly anchor for the
admin list, but do **not** couple to `client_settings` / website fields. This
keeps the legacy website + native-reputation products fully decoupled.

---

## 2. Exact data model

New tables (all `created_at`/`updated_at` + `set_updated_at` trigger; RLS enabled
with **no authenticated policy** → service-role only; admin reads go through
`requireAgencyAdmin()` + `createAdminClient()`).

### 2.1 `onboarding_invitations`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| token | text unique | unguessable (`crypto.randomBytes(24).toString("base64url")`) |
| label | text | admin's note (e.g. business name) |
| created_by | text | admin email |
| status | text | `pending` \| `completed` \| `expired` \| `revoked` |
| expires_at | timestamptz | default now()+14d |
| submission_id | uuid null | set once completed |
| created_at/updated_at | timestamptz | |

### 2.2 `onboarding_submissions`
Stores the raw form (see §Required fields). One per completed invitation.
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| invitation_id | uuid fk → onboarding_invitations | unique |
| legal_name | text not null | |
| public_name | text not null | |
| owner_first_name | text not null | |
| contact_email | text not null | |
| contact_phone | text not null | E.164 (normalized) |
| website | text | |
| address / city / state / postal_code / country | text | |
| timezone | text | IANA string (see Q) |
| google_review_link | text not null | validated URL |
| logo_url | text | public URL from token-gated upload |
| follow_up_count | int not null | check in (0,1,2,3) |
| review_request_limit_14d | int not null | check >= 0 |
| ask_for_referral | boolean not null | |
| email_subdomain | text | derived; admin-overridable |
| submitted_at | timestamptz | |

### 2.3 `ghl_provisioning`
The provisioning record + state machine anchor (one per submission).
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| submission_id | uuid fk | unique |
| client_id | uuid null fk → clients | optional anchor |
| status | text | `submitted`\|`provisioning`\|`needs_action`\|`ready`\|`failed` |
| ghl_location_id | text null | set after location create (idempotency key) |
| ghl_location_token_enc | text null | encrypted location token (if we cache it) |
| snapshot_applied | boolean default false | |
| snapshot_mode | text | `api` \| `manual` |
| custom_values_synced | boolean default false | |
| checks | jsonb default '{}' | per-check pass/fail (see §12 checks) |
| attempts | int default 0 | |
| last_error | text null | |
| locked_at | timestamptz null | claim lock for provisioning worker |

### 2.4 `ghl_custom_value_map`
Discovered custom-value IDs per location (the “explicit config map by ID”).
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| ghl_location_id | text | |
| value_key | text | stable key (the 10 required keys) |
| ghl_custom_value_id | text | discovered id |
| name_seen | text | the display name we matched on |
| unique (ghl_location_id, value_key) | | |

### 2.5 `webhook_credentials`
Per-client credential for calling `/api/review`.
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| submission_id | uuid fk | |
| public_key | text unique | non-secret; sent as `x-steelscale-key` |
| secret_hash | text | `sha256(secret)`; **plaintext never stored** |
| status | text | `active` \| `revoked` |
| last_used_at | timestamptz null | |

> The raw secret is shown to the admin **once** at generation and delivered into
> GHL by the admin. `/api/review` verifies `sha256(provided) == secret_hash`
> (timing-safe). Backward compatible: if no `x-steelscale-key` header is present,
> fall back to the existing global `STEELSCALE_WEBHOOK_SECRET` path.

### 2.6 `admin_tasks`
Manual admin to-dos (esp. snapshot loading).
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| type | text | e.g. `load_review_snapshot` |
| title | text | “Load review snapshot” |
| submission_id | uuid null fk | |
| ghl_location_id | text null | |
| status | text | `open` \| `done` |
| notes | text | |
| done_at | timestamptz null | |

### 2.7 `ghl_provisioning_events` (audit)
Append-only detail feed for the admin status screen.
`id, submission_id, step, level (info|warn|error), message, data jsonb, created_at`.

### 2.8 Agency GHL credential storage
A single agency credential (not per client). Two options (decide in §Questions):
- **Env-based** `GHL_AGENCY_API_TOKEN` + `GHL_COMPANY_ID` (if a non-expiring
  Private Integration token is available for our account) — simplest.
- **Table `ghl_agency_credentials`** (encrypted access/refresh + `expires_at`) if
  only expiring OAuth is available → needs refresh logic.

---

## 3. State machine

```
                 create invitation
                         │
                         ▼
                     [pending] ──expiry──▶ [expired]
                         │ client submits form
                         ▼
   provisioning: [submitted] ──start──▶ [provisioning]
                                            │
        ┌───────────────────────────────────┼───────────────────────────────┐
        │ all required steps ok              │ non-fatal gap                 │ fatal error
        ▼                                    ▼                               ▼
     [ready]                           [needs_action]                    [failed]
                                            │  (admin resolves,               │ (admin retries)
                                            │   e.g. loads snapshot)          │
                                            └──────────── retry ──────────────┘
                                                          │
                                                          ▼
                                                    [provisioning]
```

- **needs_action** = location created, but a human step remains (snapshot must be
  loaded manually, or an admin override is required) OR a non-required custom
  value was missing.
- **failed** = a required step failed: location create failed, agency token
  invalid, **a required custom value is absent after snapshot** (per rules), or
  webhook credential creation failed.
- Transitions are guarded and idempotent (see §Retry). `ghl_location_id` presence
  prevents duplicate location creation on retry.

---

## 4. API routes

Admin (all `requireAgencyAdmin()`):
- `POST /api/onboarding/invitations` — create invitation → returns onboarding URL.
  (Or a server action `createInvitation` on `/dashboard/onboarding`.)
- `POST /api/onboarding/[submissionId]/provision` — run/re-run provisioning.
- `POST /api/onboarding/[submissionId]/retry` — alias of provision (from failed).
- `POST /api/onboarding/[submissionId]/webhook-credential` — (re)generate secret,
  returns plaintext once.
- Admin pages: `/dashboard/onboarding` (list), `/dashboard/onboarding/[id]`
  (detailed provisioning status + events + reveal-once secret + retry).

Public (anonymous, service-role, token-gated, rate-limited):
- `GET /onboarding/[token]` — mobile-first onboarding form page (validates token).
- `POST /api/onboarding/[token]/logo` — token-gated logo upload → public URL.
- `POST /api/onboarding/[token]/submit` — validate (zod) → store submission →
  mark invitation completed → **kick off provisioning** → respond with a
  **generic success** message (client never sees GHL details).

Provisioning trigger model (serverless):
- Simplest MVP: run provisioning **synchronously inside `/submit`** with a short
  `maxDuration`, wrapped so any failure still returns the client a generic
  success and sets `status` for admins. Because GHL calls can be slow, prefer:
  respond success immediately, then run provisioning via an **admin-visible
  pending state** that the admin can also trigger/retry. (No queue is being
  built — see §Retry and §Questions.)

The `/api/review` endpoint is **reused as-is** except for the additive per-client
credential verification described in §8/§11.

---

## 5. GHL authentication model

> **All GHL endpoints, scopes, headers, and payloads below are UNVERIFIED and
> must be confirmed against the official HighLevel API docs for our account
> type before implementation. Do not treat these as final.**

- The agency authenticates **once** with its own credentials; the client never
  authenticates. Candidate models:
  - **HighLevel API v2 (LeadConnect)** OAuth 2.0 marketplace app with an
    **agency/Company-level token** (scopes likely include `locations.write`,
    `locations.readonly`, custom-values read/write, `snapshots.readonly`), plus
    **location-level tokens** minted per sub-account.
  - **Private Integration token** (agency-level, potentially non-expiring) if our
    plan supports it — simplest, avoids refresh.
- Likely request conventions (VERIFY): base `https://services.leadconnectorhq.com`,
  header `Version: 2021-07-28`, `Authorization: Bearer <token>`.
- **Location token**: creating a sub-account returns/needs a location-scoped token
  to read/write that location’s custom values. Candidate: `POST /oauth/locationToken`
  with `companyId` + `locationId` from an agency token (VERIFY existence/shape).
- Store the **agency** credential encrypted (`crypto.ts`) or in env (Private
  Integration). Cache **location** tokens only as long as needed; re-mint on
  demand. Never expose any GHL token to the browser.

`src/lib/ghl/config.ts` implements a **fail-fast loader** (`loadGhlConfig()`)
mirroring `loadTwilioConfig()`; missing agency config → `ConfigurationError` →
provisioning `failed` with a clear admin message.

---

## 6. File-by-file implementation plan

> Nothing here is created in this task. This is the build map.

**Migrations**
- `supabase/migrations/0029_ghl_onboarding.sql` — tables in §2 (+ RLS, triggers,
  indexes). Additive only.

**GHL service layer — `src/lib/ghl/`**
- `config.ts` — `loadGhlConfig()` (agency token/companyId, base URL, snapshot id,
  Nifty image URL), fail-fast.
- `errors.ts` — `GhlError`, `GhlAuthError`, `GhlNotFoundError` (map to provisioning
  status). Reuse `withRetry` from `src/lib/integration/retry.ts`.
- `client.ts` — thin fetch wrapper: base URL + `Version` header + bearer token +
  retry on 429/5xx + structured logging into `ghl_provisioning_events`.
- `token.ts` — agency token access (+ refresh if OAuth); `getLocationToken()`.
- `locations.ts` — `createLocation(input)`; `getLocation(id)`;
  (`deleteLocation(id)` for rollback — VERIFY).
- `customValues.ts` — `listCustomValues(locationId)`, `updateCustomValue(id,val)`,
  `createCustomValue(...)` (only if creating missing values is in scope — default:
  do **not** create; missing required = fail).
- `snapshots.ts` — `listSnapshots()`; **no fabricated apply endpoint**.

**Onboarding domain — `src/lib/onboarding/`**
- `types.ts` — submission/provisioning/credential types + the value-key union.
- `validation.ts` — zod schema for the form (mirrors §Required fields).
- `mapping.ts` — pure functions: form → the 10 custom values; `deriveEmailSubdomain(website)`;
  `followUpToServiceType()`; `referralToYesNo()`. (Unit-tested.)
- `provisioning.ts` — the pipeline/state machine orchestrator (stages 4–13).
- `credentials.ts` — `generateWebhookCredential()` (public key + secret + hash).
- `invitations.ts` — create/validate/expire tokens.
- `store.server.ts` — DB access via admin client.

**Public routes/pages**
- `src/app/onboarding/[token]/page.tsx` — server validates token, renders form.
- `src/components/onboarding/OnboardingForm.tsx` — mobile-first client form
  (base `ui` kit; logo upload → `/api/onboarding/[token]/logo`).
- `src/app/api/onboarding/[token]/submit/route.ts`
- `src/app/api/onboarding/[token]/logo/route.ts`

**Admin routes/pages**
- `src/app/dashboard/onboarding/page.tsx` (list), `.../[id]/page.tsx` (detail).
- `src/app/dashboard/onboarding/actions.ts` — createInvitation, provision, retry,
  regenerate credential, resolve admin task.
- `src/app/api/onboarding/[submissionId]/provision/route.ts`

**Endpoint change (additive, backward compatible)**
- `src/lib/review/security/secret.ts` — extend to accept a per-client key/secret
  (`x-steelscale-key` + `x-steelscale-secret`) looked up in `webhook_credentials`,
  falling back to the global secret when the key header is absent.

**Env**
- `.env.example` — add `GHL_*`, `NIFTY_IMAGE_URL`, onboarding base URL.

**Tests** — colocated `*.test.ts` (see §10).

---

## 7. Snapshot limitation analysis

- **Requirement:** the new location must carry the review snapshot (workflows +
  custom values). Stages allow either automatic apply *if officially supported*
  or a manual admin task otherwise.
- **Known constraints (VERIFY against docs):**
  - Listing snapshots is generally available (candidate `GET /snapshots/?companyId=`).
  - **Applying a snapshot to an existing location is historically NOT exposed by
    the public API.** The legacy v1 create-location (`POST /v1/locations/`) is
    reported to accept a `snapshotId` at **creation time**; whether the current
    v2/agency-OAuth create-location accepts `snapshotId` is **unconfirmed**.
- **Design decision (no fabrication):**
  1. **Attempt create-with-snapshot only if the official docs confirm** the
     create-location payload accepts `snapshotId` for our auth type. If confirmed,
     set `snapshot_mode = api`, `snapshot_applied = true` on success.
  2. **Otherwise**, create the bare location, set `snapshot_mode = manual`,
     `status = needs_action`, and open an `admin_tasks` row **“Load review
     snapshot”** (stage 7). The admin loads the snapshot in the GHL UI, then marks
     the task done, which re-runs provisioning from the custom-values step.
- Custom-value population (stages 8–10) **must run after** the snapshot exists
  (the snapshot is what creates the custom values). If run before, required values
  are absent → provisioning fails visibly (per rules). So: snapshot present →
  discover IDs → update; snapshot absent → `needs_action`, do not attempt updates.

---

## 8. Custom-value mapping strategy

**Principle:** display labels are not stable → **discover custom-value IDs by
matching name once, persist to `ghl_custom_value_map`, then update by ID.**

Required keys and their source (stages 9–10):

| # | value_key (stable) | source | rule |
|---|---|---|---|
| 1 | `google_review_link` | submission.google_review_link | required |
| 2 | `logo_link` | submission.logo_url | required |
| 3 | `text_1_image_link` | `NIFTY_IMAGE_URL` (config) or blank | may stay blank until native image system |
| 4 | `business_owner_name` | submission.owner_first_name | required |
| 5 | `business_name` | submission.public_name | required |
| 6 | `9_email_sending_subdomain_after_the_` | `deriveEmailSubdomain(website)` | admin-overridable (Q: exact format) |
| 7 | `minimum_review_requests_per_14_days` | submission.review_request_limit_14d | required (Q: name vs form label) |
| 8 | `service_type` | submission.follow_up_count | **legacy naming = follow-up count** |
| 9 | `review_requests_per_14_days` | `0` | **system-managed, init 0** |
| 10 | `10_ask_for_a_referral_if_customer_has_already_left_a_review_yes_or_no` | submission.ask_for_referral | `"yes"`/`"no"` |

Discovery/update algorithm:
1. `listCustomValues(locationId)` → array of `{id, name, value}`.
2. For each required key, match by a **normalized name table** (config map:
   `value_key → [candidate names]`), record the discovered `id` + `name_seen` in
   `ghl_custom_value_map`.
3. **Fail visibly** if any *required* key (1,2,4,5,7,8,9, and 6/10 per decision)
   is not found → `checks.custom_values = fail`, `status = failed`, event logged,
   admin sees exactly which keys are missing. (Keys 3 optional.)
4. `updateCustomValue(id, value)` by ID for each matched key.
5. `custom_values_synced = true` only when all required keys updated.

Derivations (pure, unit-tested in `mapping.ts`):
- `deriveEmailSubdomain(website)`: parse hostname (strip scheme/`www.`), produce
  the expected subdomain token; **admin override** stored on submission. (Exact
  transform is a Q — the field name suggests “the part after the 9_…”.)
- `service_type = String(follow_up_count)` (0–3).
- `ask_for_referral → "yes"|"no"`.

---

## 9. Retry strategy

- **Transport retries:** reuse `withRetry` (`src/lib/integration/retry.ts`) for
  GHL calls — exponential backoff + jitter on 429/5xx; do **not** retry 4xx
  auth/validation (use `NonRetryableError`).
- **Idempotent provisioning:** each stage is guarded by stored state:
  - Location create only if `ghl_location_id` is null (prevents duplicate
    sub-accounts on retry).
  - Custom-value updates keyed by discovered ID; re-running overwrites safely.
  - Webhook credential created only if none `active` for the submission.
- **Claim lock:** `ghl_provisioning.locked_at` (short TTL) so a manual retry and
  an in-flight run don’t collide (same pattern as the review engine).
- **Attempts + backoff at the provisioning level:** increment `attempts`; after N,
  keep `status = failed` with `last_error`; admins retry manually from the detail
  page. No automatic background queue is built (serverless + no queue in scope).
- **needs_action** is a *pause*, not a failure: resolved by the admin (snapshot
  loaded / override set), then re-run continues from the custom-values step.

---

## 10. Security controls

- **Anonymous but gated:** onboarding is reachable only with a valid, unguessable,
  **expiring, single-use** invitation token. Submit + logo routes are
  service-role, token-validated, and **rate-limited + body/size-limited** (reuse
  the patterns in `src/lib/review/security/*`).
- **Admin gating:** every admin route/action calls `requireAgencyAdmin()`;
  provisioning re-asserts it server-side.
- **Secrets at rest:** agency GHL token and any cached location token **encrypted**
  via `crypto.ts` (AES-256-GCM, `CREDENTIALS_ENCRYPTION_KEY`). Per-client webhook
  secret is **hashed** (`sha256`), never stored in plaintext; revealed to admin
  once.
- **Per-client webhook auth:** `/api/review` verifies `x-steelscale-key` +
  `x-steelscale-secret` against `webhook_credentials` (timing-safe hash compare),
  with fallback to the global secret. Revocation supported (`status = revoked`).
- **RLS:** new tables service-role only (no authenticated policy); browser never
  reads them. GHL tokens never sent to the client.
- **Input validation:** zod on submit; logo upload validated (image, ≤5 MB);
  phone normalized; review link must be a valid URL.
- **PII minimization:** store only what provisioning needs; do not mirror into the
  legacy `client_settings` product tables.
- **No client login / no client GHL access** — matches business rules.

---

## 11. Testing plan (Vitest)

Pure/unit (no network):
- `mapping.test.ts` — all 10 mappings incl. `service_type = follow_up_count`,
  referral yes/no, `review_requests_per_14_days = 0`, blank `text_1_image_link`,
  `deriveEmailSubdomain()` for various websites (+ override wins).
- `validation.test.ts` — zod schema: required fields, follow_up_count ∈ {0..3},
  URL/phone validation.
- `credentials.test.ts` — key/secret generation, `sha256` hash, verify accept/reject.
- `stateMachine.test.ts` — legal transitions; needs_action↔provisioning; failed→retry.

Service with mocked `fetch`:
- `ghl/client.test.ts` — headers/version/bearer; retry on 429/5xx; no-retry on 401.
- `ghl/customValues.test.ts` — discovery by name → ID map; **required-missing →
  failure**; update-by-ID calls.
- `ghl/locations.test.ts` — create payload; idempotency (skip when id exists).

Pipeline with mocked GHL service:
- `provisioning.test.ts` — happy path → `ready`; snapshot-unsupported →
  `needs_action` + `admin_tasks` row; required custom value absent → `failed`
  with the missing keys surfaced.

Endpoint change:
- `secret.test.ts` (extend existing) — per-client key/secret accepted; wrong secret
  rejected; **global-secret fallback still works**.

No live GHL/Twilio calls in tests.

---

## 12. Provisioning checks (stage 12)

`checks` jsonb records each, surfaced on the admin detail page:
- `agency_auth` — agency token valid.
- `location_created` — `ghl_location_id` present.
- `snapshot` — `api` applied OR `manual` task open/done.
- `custom_values_discovered` — all required keys mapped to IDs.
- `custom_values_updated` — all required keys written.
- `webhook_credential` — active credential exists.

Aggregate → status: all pass → **ready**; any *required* fail → **failed**;
only snapshot/manual or override pending → **needs_action**.

---

## 13. Manual setup prerequisites

1. **GHL agency API access** for our account: create the marketplace app **or**
   Private Integration token; capture `companyId`, token, and required scopes.
2. **Build/confirm the review snapshot** in GHL containing the workflows **and the
   10 custom values with the exact names** in §8. Record its snapshot **id/name**.
3. Confirm (from docs) whether create-location accepts `snapshotId` for our auth
   type → sets `snapshot_mode` default (`api` vs `manual`).
4. **Env vars** (Vercel): `GHL_AGENCY_API_TOKEN` (or OAuth pair) + `GHL_COMPANY_ID`,
   `GHL_SNAPSHOT_ID`, `NIFTY_IMAGE_URL`, `ONBOARDING_BASE_URL`,
   plus existing `CREDENTIALS_ENCRYPTION_KEY`.
5. **Run migration `0029`.** Storage bucket `client-media` already exists (reused).
6. If snapshot API is unsupported: the **“Load review snapshot”** admin task is a
   genuine human step in GHL for each new location.

---

## 14. Rollback plan

- **Additive migration:** `0029` only creates new tables. Rollback = drop those
  tables; **no existing table is altered**. `clients`/`client_settings`/reputation
  schema untouched.
- **Endpoint change is backward compatible:** the per-client credential check in
  `/api/review` falls back to the global secret. Reverting the secret file
  restores the exact prior behavior; existing callers using the global secret keep
  working throughout.
- **Feature flag:** gate the onboarding routes behind `loadGhlConfig()` presence /
  an `ONBOARDING_ENABLED` flag so the feature can be dark-shipped and disabled
  instantly.
- **GHL side:** provisioning failures never reach the client (generic success).
  De-provisioning a mistakenly created location is a manual GHL admin action (or a
  `deleteLocation` call **iff** the API supports it — VERIFY); mark the submission
  `failed`.
- No queue, no cron, no changes to deployment infra → nothing to unwind there.

---

## 15. Questions that cannot be answered from the repository

**GHL API (verify against official docs — do not fabricate):**
1. Exact endpoint/scope/payload to **create a sub-account/location** under our
   agency for our auth type, and whether it accepts `snapshotId` at creation.
2. Whether/how to mint a **location access token** from the agency token
   (endpoint, params).
3. Exact **custom-values** read/update endpoints + version header, and whether the
   API can **create** a missing custom value (or if that must come only from the
   snapshot).
4. Whether **applying a snapshot to an existing location** is supported at all for
   our account/auth type (drives `api` vs `manual`).
5. Whether to use a **Private Integration token** (non-expiring) or a full **OAuth
   marketplace app** (refresh needed).
6. Rate limits / pagination shape for the calls above (tunes retry + discovery).

**Product / mapping decisions (need your call):**
7. **Custom value #6** `9_email_sending_subdomain_after_the_`: the exact expected
   value/format and the precise derivation from the website hostname.
8. **#7 `minimum_review_requests_per_14_days` vs the form’s “Review-request limit
   per 14 days” vs #9 `review_requests_per_14_days`.** Confirm the form field maps
   to #7 (a minimum/cap) and #9 initializes to 0 (system counter). The naming is
   confusing.
9. Is `NIFTY_IMAGE_URL` a **fixed constant** to use for `text_1_image_link`, or
   should it stay blank?
10. **Timezone**: does GHL expect an **IANA** string (e.g. `America/New_York`) or
    its own enum? Same question for **country/state** codes.
11. Should onboarding create/anchor a **`clients` row** (for the admin list), or
    stay fully standalone with an optional link?
12. Should per-client webhook credentials **replace** the global
    `STEELSCALE_WEBHOOK_SECRET` eventually, or **coexist** indefinitely?
13. **Provisioning trigger:** synchronous inside `/submit` (risk: serverless
    timeout on slow GHL) vs. respond-then-admin-triggered. Any appetite for a
    lightweight scheduler if GHL calls are slow?
14. **Data retention** for onboarding PII (submissions/logos) — any deletion policy?
15. Confirm clients truly **never** get any login or portal (assumed: correct).

---

## Appendix A — Required onboarding fields (form)
Legal/business name · Public business name · Business owner first name · Primary
contact email · Primary contact phone · Business website · Business address ·
City · State · Postal code · Country · Time zone · Google review link · Logo
upload · Follow-up count (0/1/2/3) · Review-request limit per 14 days · Ask for
referral when already reviewed (yes/no).

## Appendix B — MVP stages → where they live
1. Create invitation → admin action / `POST /api/onboarding/invitations`.
2. Client completes form → `/onboarding/[token]` page.
3. Store submission → `/api/onboarding/[token]/submit` → `onboarding_submissions`.
4. Create GHL location → `ghl/locations.createLocation` (provisioning stage).
5. Store location id → `ghl_provisioning.ghl_location_id`.
6. Apply snapshot if supported → `snapshot_mode=api` (else →7).
7. Else admin task “Load review snapshot” → `admin_tasks`.
8. Retrieve custom values → `ghl/customValues.listCustomValues`.
9. Match by stable key/name → `ghl_custom_value_map`.
10. Update values → `updateCustomValue` (fail if required missing).
11. Generate webhook public key + secret → `webhook_credentials`.
12. Run provisioning checks → `ghl_provisioning.checks`.
13. Mark ready / needs_action / failed → `status`.
14. Client sees generic success → `/submit` response + page.
15. Admin sees detailed status → `/dashboard/onboarding/[id]`.
