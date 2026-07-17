# Creating the GHL Marketplace App (OAuth)

This guide walks you through creating the GoHighLevel **Marketplace app** that
lets your provisioning system act on your agency — creating sub‑accounts, minting
location tokens, and reading/updating custom values. It ends with a **one‑time
manual step** to obtain the access/refresh tokens your app needs, because this
repo currently reads those from environment variables (there is **no in‑app
"Connect GHL" callback route yet** — see the note at the end).

> **Heads‑up on accuracy.** GHL's developer platform and exact endpoint/scope
> strings change over time. The values here match what the code expects
> (`src/lib/ghl/config.ts`) and the documented v2 API, but **confirm each screen
> against the current GHL developer docs** as you go. Everything is centralized
> in `config.ts`, so a corrected scope or URL is a one‑line change.

> **Simpler alternative:** if you don't want OAuth yet, you can run on a
> **Private Integration Token** instead (set `GHL_AUTH_METHOD=private_integration`
> and `GHL_PRIVATE_INTEGRATION_TOKEN`). It's quicker but non‑refreshing and often
> location‑scoped — see `docs/ghl-authentication-setup.md §3`. This guide is the
> full OAuth path.

---

## What you'll end up with

Five values in your environment:

| Env var | From |
| --- | --- |
| `GHL_CLIENT_ID` | Marketplace app |
| `GHL_CLIENT_SECRET` | Marketplace app |
| `GHL_ACCESS_TOKEN` | one‑time token exchange (step 6) |
| `GHL_REFRESH_TOKEN` | one‑time token exchange (step 6) |
| `GHL_GRANTED_SCOPES` | the scopes you approved |

Plus `GHL_AUTH_METHOD=oauth` and `GHL_COMPANY_ID` (your agency ID).

---

## Step 1 — Create a developer account

1. Go to the GHL Marketplace developer portal: **https://marketplace.gohighlevel.com/**
2. Sign in / create a **developer** account (separate from your normal GHL login).
3. Open the developer dashboard.

## Step 2 — Create a new app

1. Click **Create App** (or **My Apps → Create**).
2. **App name:** anything internal, e.g. `Steel Scale Provisioning`.
3. **App type / distribution:** choose so the app installs on an **Agency
   (Company)**, not a single sub‑account — you need agency‑level access to create
   sub‑accounts. (Look for "Distribution type: Agency" / "Sub‑account & Agency".)
4. Save to create the app shell.

## Step 3 — Add the Redirect URL

The redirect URL is where GHL sends the temporary `code` after you authorize.
Register this exact URL (even though the handler isn't built yet — you'll capture
the code from the browser in step 5):

```
https://<YOUR_APP_DOMAIN>/api/integrations/ghl/oauth/callback
```

For local testing you can also add:

```
http://localhost:3000/api/integrations/ghl/oauth/callback
```

> Add both if the app allows multiple redirect URLs. The value you use in the
> authorize link (step 5) **must exactly match** one you registered here.

## Step 4 — Add scopes

Add these scopes to the app (the code expects these exact strings; confirm them
in the scope picker):

| Purpose | Scope |
| --- | --- |
| Read sub‑accounts (locations) | `locations.readonly` |
| Create/update sub‑accounts | `locations.write` |
| Read location custom values | `locations/customValues.readonly` |
| Update location custom values | `locations/customValues.write` |
| List snapshots | `snapshots.readonly` |

Save. Then copy the app's **Client ID** and **Client Secret** and set:

```
GHL_AUTH_METHOD=oauth
GHL_CLIENT_ID=<client id>
GHL_CLIENT_SECRET=<client secret>
GHL_COMPANY_ID=<your agency/company id>
GHL_GRANTED_SCOPES=locations.readonly locations.write locations/customValues.readonly locations/customValues.write snapshots.readonly
```

(Find the Company ID under **Agency Settings → Company** in GHL.)

---

## Step 5 — Authorize the app on your agency (get a `code`)

Build an **authorize URL** and open it in your browser while logged into your
agency. Replace the placeholders:

```
https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&client_id=<CLIENT_ID>&redirect_uri=https://<YOUR_APP_DOMAIN>/api/integrations/ghl/oauth/callback&scope=locations.readonly%20locations.write%20locations/customValues.readonly%20locations/customValues.write%20snapshots.readonly
```

1. Open that URL. GHL shows a consent screen.
2. Choose your **Agency / Company** (not a single sub‑account) and approve.
3. GHL redirects to your redirect URL with `?code=XXXXItem...` appended.

> Because the callback route isn't built, that page will likely show a 404 or a
> blank error — **that's fine**. Look at the browser's **address bar** and copy
> the `code=` value out of the URL. That code is short‑lived (use it within a
> minute or two).

## Step 6 — Exchange the `code` for tokens (one‑time)

Run this from a terminal, filling in the four values. This calls the documented
token endpoint and asks for an **agency (Company)** token:

```bash
curl -s -X POST https://services.leadconnectorhq.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "client_id=<CLIENT_ID>" \
  --data-urlencode "client_secret=<CLIENT_SECRET>" \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "code=<CODE_FROM_STEP_5>" \
  --data-urlencode "user_type=Company" \
  --data-urlencode "redirect_uri=https://<YOUR_APP_DOMAIN>/api/integrations/ghl/oauth/callback"
```

The response is JSON like:

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "expires_in": 86399,
  "scope": "locations.readonly locations.write ...",
  "token_type": "Bearer"
}
```

Set these in your environment:

```
GHL_ACCESS_TOKEN=<access_token>
GHL_REFRESH_TOKEN=<refresh_token>
# optional but helpful — lets the app know when to refresh proactively:
GHL_TOKEN_EXPIRES_AT=<an ISO timestamp ~expires_in seconds from now>
```

> After this one‑time step, your app **refreshes the access token automatically**
> using the refresh token (with stampede protection), so you don't repeat this.
> Keep the refresh token safe — without it the app can't refresh and you'd redo
> steps 5–6.

## Step 7 — Deploy and verify

1. Add all the env vars above to your hosting (e.g. Vercel → Project → Settings →
   Environment Variables) and redeploy.
2. Onboard a test client (or click **Retry provisioning** on one). If the GHL
   credentials are wrong or missing a scope, provisioning fails fast with a clear
   configuration error naming the problem (e.g. a missing scope).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Consent screen won't let you pick the agency | App distribution is sub‑account‑only | Set the app's distribution to include **Agency/Company** (step 2) and re‑authorize |
| `redirect_uri mismatch` | The URL in step 5 doesn't match a registered one | Make them **byte‑for‑byte** identical (scheme, host, path, no trailing slash) |
| Token exchange returns `invalid_grant` | The `code` expired or was already used | Redo step 5 to get a fresh code, then step 6 immediately |
| App logs `ghl.scopes.unverified` warning | `GHL_GRANTED_SCOPES` not set | Set it to the scopes you approved (step 4) |
| Provisioning: "missing required scopes" | The token wasn't granted a needed scope | Add the scope in the app, re‑authorize (steps 5–6) |
| 401 from GHL on provisioning | Token invalid/expired and no refresh token | Ensure `GHL_REFRESH_TOKEN` is set; otherwise redo steps 5–6 |

---

## Note: making this a one‑click "Connect GHL" button

Right now token acquisition is the manual steps 5–6 because there's **no OAuth
callback route** in the app. If you'd like, I can build a small admin‑only route
(`/api/integrations/ghl/oauth/callback`) that captures the `code`, performs the
step‑6 exchange automatically, and stores the tokens (encrypted) in the
`ghl_connections` table — turning this into a single **Connect GHL** click in the
dashboard instead of curl. Say the word and I'll add it.

## Related docs
- `docs/ghl-authentication-setup.md` — auth model, scopes, PIT alternative, env var reference
- `docs/ghl-setup-guide.md` — the GHL‑side review workflow + webhook setup
- `docs/onboarding-system-guide.md` — the dashboard onboarding/provisioning flow
