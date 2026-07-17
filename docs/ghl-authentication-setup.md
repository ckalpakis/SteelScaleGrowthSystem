# HighLevel (GoHighLevel) Authentication Setup

This document explains how to configure the credentials the agency-level
GoHighLevel (HighLevel) integration needs to **create sub-accounts (locations),
mint location access tokens, read/update location custom values, and list
snapshots**.

The integration code lives in `src/lib/ghl/` and is **server-only**. Tokens are
loaded from environment variables, used only on the server, and never returned
to the browser.

> **Important:** HighLevel's developer platform changes over time. Every
> endpoint path and scope string used by this integration is centralized in
> `src/lib/ghl/config.ts` and marked with `VERIFY` comments. Before going to
> production, confirm each against the live docs at
> <https://highlevel.stoplight.io/> / <https://marketplace.gohighlevel.com/>.

---

## 1. Which authentication method to use

Creating sub-accounts and minting location tokens are **agency (Company) level**
operations. Two credential types can carry an agency token:

| Method | Env `GHL_AUTH_METHOD` | When to use | Limitations |
| --- | --- | --- | --- |
| **OAuth 2.0 (recommended)** | `oauth` | New production integrations. Required for full agency capabilities and for minting location tokens from an agency token. | Requires a Marketplace app, an install/authorization flow, and token refresh. |
| **Private Integration Token (PIT)** | `private_integration` | Simple internal use, quick testing. | PITs are commonly **location-scoped**; an agency-level PIT may **not** be able to create sub-accounts or mint location tokens on every plan. Verify your plan before relying on it. Non-refreshing. |
| ~~v1 Agency API key~~ | — | **Do not use.** Deprecated; not used by this integration. | Legacy, being retired. |

**Default and recommendation: OAuth.** The code defaults to `oauth` and supports
`private_integration` behind the config switch so you can start testing quickly,
but production provisioning should use OAuth.

---

## 2. OAuth 2.0 setup (recommended)

### 2.1 Create a Marketplace app

1. Go to the **HighLevel Marketplace developer console**
   (<https://marketplace.gohighlevel.com/>) and create an app.
2. Set the app **distribution type** so it can be installed on your **agency
   (Company)**, since sub-account creation is agency-level.
3. Add a **Redirect URL** (see below).
4. Note the **Client ID** and **Client Secret**.

### 2.2 Redirect URL

The redirect URL is where HighLevel sends the `code` after an agency admin
authorizes the app. For this repository (Next.js on Vercel) a natural choice is:

```
https://<your-domain>/api/integrations/reviews/oauth/callback
```

For local development:

```
http://localhost:3000/api/integrations/reviews/oauth/callback
```

> The OAuth **callback route itself is out of scope** for this task (no UI /
> onboarding form yet). Register the URL now so the app is ready; the callback
> handler is added when the onboarding flow is built. Until then you can seed
> the initial tokens manually (see 2.5).

### 2.3 Scopes to request

Request at least the scopes below (confirm exact strings in the app's scope
picker — they are centralized in `GHL_SCOPES` in `config.ts`):

| Capability | Scope (verify) |
| --- | --- |
| Read locations | `locations.readonly` |
| Create / update locations | `locations.write` |
| Read location custom values | `locations/customValues.readonly` |
| Update location custom values | `locations/customValues.write` |
| List snapshots | `snapshots.readonly` |

The auth manager verifies granted scopes before each operation. Populate
`GHL_GRANTED_SCOPES` with the space/comma-separated scopes your token actually
received so a missing scope fails fast with a clear configuration error instead
of a confusing 401/403. If `GHL_GRANTED_SCOPES` is left empty, the integration
logs a warning (`ghl.scopes.unverified`) and proceeds.

### 2.4 Authorization + token exchange (concept)

1. Redirect the agency admin to HighLevel's authorize URL (`chooselocation` /
   agency authorize endpoint) with your `client_id`, `redirect_uri`,
   `response_type=code`, and the scopes above.
2. HighLevel redirects back to your Redirect URL with a `code`.
3. Exchange the `code` at the token endpoint
   (`POST https://services.leadconnectorhq.com/oauth/token`) with
   `grant_type=authorization_code`, `client_id`, `client_secret`,
   `redirect_uri`, and `user_type=Company` (agency token). **Verify** the exact
   parameters against the live docs.
4. Store the returned `access_token`, `refresh_token`, and `expires_in`.

### 2.5 Token refresh (handled automatically)

`GhlAuthManager` refreshes the access token ~60s before expiry using the refresh
token, with **single-flight** protection so concurrent requests never trigger a
refresh stampede. In production, provide a persistent `TokenStore` (e.g. backed
by the `ghl_connections` table) so the refreshed token survives across
serverless invocations — the default in-memory store is per-instance only.

Seed the initial tokens from the OAuth install via env vars
(`GHL_ACCESS_TOKEN`, `GHL_REFRESH_TOKEN`, optionally `GHL_TOKEN_EXPIRES_AT`).

---

## 3. Private Integration Token setup (optional / testing)

1. In the HighLevel agency or location settings, create a **Private Integration**
   and grant it the scopes from §2.3.
2. Copy the token into `GHL_PRIVATE_INTEGRATION_TOKEN` and set
   `GHL_AUTH_METHOD=private_integration`.

**Limitations:** PITs do not refresh, and they are frequently **location-scoped**
— an agency-level PIT may be unable to create sub-accounts or mint location
tokens depending on your plan. If agency operations return 401/403 under a PIT,
switch to OAuth.

---

## 4. Snapshots

Listing snapshots (`GET /snapshots/`) is supported. **Applying** a snapshot to an
existing location, or **creating** a location directly from a snapshot, has **no
official public API v2 endpoint** at the pinned API version. The integration
therefore does not fake it: `snapshotAutomationSupport()` returns
`{ supported: false, requiresManualTask: true }`, and provisioning is expected to
create a manual admin task so an operator applies the snapshot in the dashboard.
If HighLevel ships an official endpoint, update `src/lib/ghl/snapshots.ts`.

---

## 5. Required environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `GHL_AUTH_METHOD` | No (default `oauth`) | `oauth` or `private_integration`. |
| `GHL_COMPANY_ID` | **Yes** | Your agency / Company id. |
| `GHL_BASE_URL` | No | API base. Default `https://services.leadconnectorhq.com`. |
| `GHL_API_VERSION` | No | Sent as the `Version` header. Default `2021-07-28`. |
| `GHL_TIMEOUT_MS` | No | Per-request timeout. Default `15000`. |
| `GHL_GRANTED_SCOPES` | Recommended | Space/comma-separated scopes the token holds, for fast scope verification. |
| **OAuth** | | |
| `GHL_CLIENT_ID` | Yes (oauth) | Marketplace app client id. |
| `GHL_CLIENT_SECRET` | Yes (oauth) | Marketplace app client secret. |
| `GHL_ACCESS_TOKEN` | Yes (oauth) | Seed agency access token from the install. |
| `GHL_REFRESH_TOKEN` | Recommended (oauth) | Refresh token; without it the token cannot be refreshed. |
| `GHL_TOKEN_EXPIRES_AT` | No | ISO timestamp of access-token expiry (optimizes first refresh). |
| `GHL_TOKEN_URL` | No | Override the token endpoint. Default `${GHL_BASE_URL}/oauth/token`. |
| **Private Integration Token** | | |
| `GHL_PRIVATE_INTEGRATION_TOKEN` | Yes (private_integration) | The PIT value. |

All of these are also listed in `.env.example`.

---

## 6. Security notes

- The `src/lib/ghl/` module is **server-only**. Never import it from a client
  component; never send any GHL token to the browser.
- The HTTP client redacts the `Authorization` header from logs and never logs
  full response bodies (only status, correlation id, and — on schema failure —
  the failing field paths).
- Location access tokens minted via `getLocationAccessToken()` are short-lived
  and must stay server-side.
- Store long-lived credentials encrypted at rest (the repo already has
  `src/lib/crypto.ts` and the `ghl_connections` table for this).
