# SOP: Launch a client site on their own domain

Goal: serve a client's website at **their own domain** (e.g. `threeriversroofing.com`)
instead of `steelscalesystems.com/site/<slug>`.

**How it works (context):** the app is multi-tenant. When a request comes in on a
domain that isn't your agency root, the middleware looks up `clients.domain` in the
database, finds the matching client, and serves their site at the domain root — no
redirect, the URL stays clean. So going live on a custom domain takes **two linked
steps**: (1) tell the **app** which domain belongs to the client, and (2) tell **Vercel
+ DNS** to route that domain to the app. Both are required.

Time: ~15 minutes of work, then up to a few hours for DNS/SSL to finish.

---

## Prerequisites (one-time, agency level)
- The app is deployed on **Vercel**.
- The **`ROOT_DOMAIN`** environment variable is set in Vercel (e.g. `steelscale.xyz`).
  Without it, custom domains are ignored and every site stays on the agency host.
- You have access to the client's **domain registrar / DNS** (GoDaddy, Namecheap,
  Cloudflare, Google Domains, etc.) — either their login or delegated access.

---

## Step 1 — Set the domain on the client (in the app)
1. Log in to the dashboard as an **agency admin**.
2. **Clients → open the client → "Plan, URL & domain."**
3. In **Custom domain**, enter the bare hostname only:
   - ✅ `threeriversroofing.com`
   - ❌ not `https://…`, no `www.`, no trailing slash, no path. Lowercase.
4. **Save.**

> Pick the **apex** (`threeriversroofing.com`) as the canonical domain and use that
> exact value here. We'll make `www` redirect to it in Step 2 so both work.

## Step 2 — Add the domain to Vercel
1. Vercel → your project → **Settings → Domains → Add**.
2. Add **both**: `threeriversroofing.com` and `www.threeriversroofing.com`.
3. Set the **apex as primary** and choose **"Redirect www → apex"** when Vercel offers it
   (so `www` visitors land on the canonical domain that matches Step 1).
4. Vercel will now show you the exact **DNS records** to create. Keep this panel open.

## Step 3 — Point DNS at the registrar
At the client's DNS provider, create the records **exactly as Vercel shows them**. Typically:

| Type | Name / Host | Value |
|---|---|---|
| `A` | `@` (apex) | the IP Vercel shows (commonly `76.76.21.21`) |
| `CNAME` | `www` | `cname.vercel-dns.com` |

- Always use the **values Vercel displays** — they can change; Vercel is the source of truth.
- Remove any old conflicting `A`/`CNAME`/parking records for `@` and `www`.
- **Alternative (simplest if you manage the domain):** change the domain's **nameservers**
  to Vercel's and let Vercel handle all records automatically.

## Step 4 — Wait for propagation + SSL
- DNS usually propagates in minutes, but can take up to 24–48 hours.
- Vercel auto-issues a free SSL certificate (Let's Encrypt) once DNS resolves.
- Done when the Vercel Domains panel shows **"Valid Configuration"** and the cert is issued.

## Step 5 — Verify (go-live checklist)
- [ ] `https://theirdomain.com` loads **their** site at the root (not `/site/<slug>`, not the agency page).
- [ ] `https://www.theirdomain.com` redirects to the apex.
- [ ] The padlock (SSL) is valid.
- [ ] Inner pages work: `/services`, `/areas`, `/past-work`, `/contact`.
- [ ] Submit a **test quote** → the lead appears in the client's dashboard and the
      new-lead email fires.
- [ ] Logo, colors, phone, and content are the client's.

## Step 6 — Post-launch (recommended)
- Update the client's **Google Business Profile** and directory listings to the new domain.
- If they had an old website, set up **301 redirects** from the old URLs to the new ones.
- Submit the domain/sitemap in **Google Search Console**.

---

## Troubleshooting

- **Domain shows the agency page or a 404 instead of the client site.**
  The host doesn't match `clients.domain`. Check for: a `www` mismatch (visitor on `www`
  but DB has the apex — make sure www redirects to apex), extra spaces, uppercase, or
  `https://` accidentally saved in the field. The domain lookup is cached ~5 minutes, so
  wait a few minutes after editing, then retry.

- **Vercel says "Invalid Configuration."**
  DNS records are missing/wrong or haven't propagated. Re-check they match Vercel's values
  exactly; use a DNS checker to confirm the `A`/`CNAME` resolve.

- **Site loads but SSL is "pending."**
  Give it time after DNS resolves. If it's stuck, check the domain has no `CAA` record that
  blocks Let's Encrypt.

- **Works on apex but not www (or vice-versa).**
  Both must be added in Vercel (Step 2), and the canonical one must equal `clients.domain`.

- **Nothing happens on any custom domain.**
  Confirm `ROOT_DOMAIN` is set in Vercel and the deployment was redeployed after setting it.

---

## Quick reference (per client)
1. App → Clients → client → **Custom domain** = `theirdomain.com` → Save.
2. Vercel → Domains → add `theirdomain.com` **and** `www.theirdomain.com` (www → apex).
3. Registrar → `A @ → 76.76.21.21`, `CNAME www → cname.vercel-dns.com` (use Vercel's shown values).
4. Wait for "Valid Configuration" + SSL.
5. Test the domain + submit a test lead.

## Alternative: subdomain instead of a full domain
If a client doesn't have a domain yet, you can serve them instantly at
`theirslug.steelscale.xyz` (a subdomain of your root). That needs a one-time
**wildcard DNS record** (`CNAME *.steelscale.xyz → cname.vercel-dns.com`) and the wildcard
added in Vercel — after that, every client's subdomain works with no per-client DNS. Set
`clients.domain` blank and they're reachable at `<slug>.steelscale.xyz` automatically.
