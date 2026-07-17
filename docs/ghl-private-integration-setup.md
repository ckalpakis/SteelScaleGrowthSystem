# GHL Private Integration Token (PIT) Setup — the easy path

This is the **simplest** way to connect your provisioning system to GHL: create
**one token** in your GHL settings and paste it into **one environment
variable**. No Marketplace app, no redirect URL, no OAuth dance, no token expiry.

> **⚠️ Known blocker (confirmed): agency PITs can't complete provisioning.**
> Agency Private Integrations **do not offer the `locations/customValues.write`
> scope**, and a PIT also **cannot mint per‑location tokens** — both of which this
> system's "update custom values" step requires. If the scope picker in step 3
> doesn't list `locations/customValues.write` (it won't, for agency PITs), **PIT
> cannot run the full flow — use OAuth instead**
> (`docs/ghl-marketplace-app-setup.md`).
>
> A PIT can still work for the *read/create* parts (create sub‑account, list
> snapshots), so it's fine for early testing, but not for the custom‑value step.
> **For a working end‑to‑end setup, use OAuth.**

> **Heads‑up on accuracy.** I can't see GHL's live UI, and they rename/move menus.
> Each location below includes **alternate labels** to look for. If a label
> doesn't match, the "if you can't find it" notes will help.

---

## What you'll end up with

Four values in your environment:

```
GHL_AUTH_METHOD=private_integration
GHL_PRIVATE_INTEGRATION_TOKEN=<the token you create below>
GHL_COMPANY_ID=<your agency / company id>
GHL_GRANTED_SCOPES=locations.readonly locations.write locations/customValues.readonly locations/customValues.write snapshots.readonly
```

That's the whole configuration.

---

## Step 1 — Find your Company / Agency ID

**► Where:** your **normal GHL agency login** (`app.gohighlevel.com`) → **Agency
Settings → Company** → copy the **Company ID**.

- Alternate: it's the ID in the URL when you're in **Agency View**.
- Put it in `GHL_COMPANY_ID`.

## Step 2 — Open Private Integrations

**► Where:** in GHL, go to **Settings** (the gear) → **Private Integrations**.

- Alternate labels: **"API Keys"**, **"Integrations"**, **"Private Integration
  Tokens"**.
- **Agency vs sub‑account:** because provisioning creates sub‑accounts (an
  agency‑level action), create the token while in **Agency View** if your account
  offers Private Integrations at the agency level. If you only see Private
  Integrations inside a **sub‑account**, create it there — but be aware that token
  may be limited to that one sub‑account (that's the location‑scoped caveat; if
  provisioning can't create new sub‑accounts with it, use OAuth instead).
- **If you can't find it at all:** your plan may not expose Private Integrations —
  in that case use the OAuth Marketplace app (`docs/ghl-marketplace-app-setup.md`).

## Step 3 — Create the integration and select scopes

1. Click **Create new integration** (or **"New Integration"** / **"+ Create"**).
2. **Name:** something internal, e.g. `Steel Scale Provisioning`.
3. **Scopes:** select these (search each one and add it). The code expects these
   exact strings:

   | Purpose | Scope |
   | --- | --- |
   | Read sub‑accounts (locations) | `locations.readonly` |
   | Create/update sub‑accounts | `locations.write` |
   | Read location custom values | `locations/customValues.readonly` |
   | Update location custom values | `locations/customValues.write` |
   | List snapshots | `snapshots.readonly` |

4. Click **Create** / **Generate**.

## Step 4 — Copy the token (shown once)

GHL displays the token **one time**. Copy it immediately — if you lose it you'll
delete the integration and make a new one.

- The token usually starts with something like `pit-…`.
- **Treat it like a password.** It doesn't expire, so anyone with it has your
  access until you revoke it. Never commit it, never paste it in the browser,
  never log it.

## Step 5 — Set the environment variables

In your hosting (e.g. **Vercel → Project → Settings → Environment Variables**),
add:

```
GHL_AUTH_METHOD=private_integration
GHL_PRIVATE_INTEGRATION_TOKEN=<the token from step 4>
GHL_COMPANY_ID=<your company id from step 1>
GHL_GRANTED_SCOPES=locations.readonly locations.write locations/customValues.readonly locations/customValues.write snapshots.readonly
```

Then **redeploy** so the new variables take effect.

> `GHL_GRANTED_SCOPES` isn't strictly required, but setting it lets the app fail
> fast with a clear "missing scope" message instead of a confusing 401 if you
> forgot one in step 3.

## Step 6 — Verify it works

1. Onboard a test client (or open a queued one and click **Retry provisioning**).
2. Watch the client's **Provisioning timeline**:
   - If it reaches **create location** and gets a GHL location ID → 🎉 PIT works,
     you're done. Continue with the normal snapshot/webhook steps
     (`docs/ghl-setup-guide.md`).
   - If it **fails at create location with an auth/permission error** → your PIT
     can't do agency‑level actions on this plan. Switch to OAuth
     (`docs/ghl-marketplace-app-setup.md`). Nothing else about your setup changes.

---

## Rotating or revoking the token

- **Rotate:** create a new Private Integration (steps 3–4), update
  `GHL_PRIVATE_INTEGRATION_TOKEN`, redeploy, then delete the old integration in
  GHL.
- **Revoke immediately** (if leaked): delete the integration in GHL — that
  invalidates the token at once. Then create a fresh one.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| No **Private Integrations** menu | Plan doesn't expose PITs | Use OAuth (`docs/ghl-marketplace-app-setup.md`) |
| Provisioning fails at **create location** (401/403) | PIT is location‑scoped / can't create sub‑accounts | Switch to OAuth |
| App logs **"missing required scopes"** | A scope wasn't added in step 3 | Recreate the integration with all five scopes, update the env var |
| App logs `ghl.scopes.unverified` | `GHL_GRANTED_SCOPES` not set | Set it to the five scopes above |
| Changes not taking effect | Env vars added but not deployed | Redeploy after editing env vars |

---

## How this compares (quick recap)

| | Setup effort | Ongoing effort | Completes full provisioning (incl. custom values)? |
| --- | --- | --- | --- |
| **PIT (this guide)** | Lowest — one token, one env var | Lowest — never expires | **No** — agency PITs lack `locations/customValues.write` and can't mint location tokens |
| **OAuth Marketplace app** | Higher — app + redirect + scopes + token grab | Auto‑refreshes | **Yes** — exposes custom‑value write and mints per‑location tokens |

## Related docs
- `docs/ghl-marketplace-app-setup.md` — the OAuth fallback, if PIT can't create sub‑accounts
- `docs/ghl-authentication-setup.md` — auth model + full env‑var reference
- `docs/ghl-setup-guide.md` — the GHL‑side snapshot + review‑workflow webhook setup
- `docs/onboarding-system-guide.md` — the dashboard onboarding/provisioning flow
