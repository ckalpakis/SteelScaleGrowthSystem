# Setup guide: Twilio SMS + Vercel environment variables

This turns on **automated review requests** (email + text). Email already works
through Resend; this guide adds the **text** half (Twilio) and the environment
variables Vercel needs. Budget ~30 minutes, plus 1–3 business days for Twilio's
10DLC review (you can use email in the meantime).

---

## Part A — Twilio (for the SMS half)

You only need to do this once, for your agency. One Twilio number texts on behalf
of every client; each client's business name is written into the message.

### 1. Create a Twilio account
1. Go to **twilio.com** → sign up → verify your email and your personal phone.
2. When asked what you're building, pick **Messaging / SMS**. (Any answer is fine.)

### 2. Buy a phone number
1. In the Twilio Console: **Phone Numbers → Manage → Buy a number**.
2. Filter by your country (US), check the **SMS** capability box, and buy a
   **local** number (a local number is fine; a Toll-Free number is an alternative
   with a different, often faster, verification path).
3. Cost is ~$1–2/month for the number, plus ~$0.008 per text.

### 3. Grab your credentials
On the Twilio Console **dashboard (home page)** you'll see:
- **Account SID** — starts with `AC…`
- **Auth Token** — click to reveal (keep this secret, like a password)

You'll also use the **phone number you just bought**, in E.164 format:
`+1` followed by the 10 digits, e.g. `+14125551234`.

### 4. Register for A2P 10DLC (required to text US numbers reliably)
US carriers require business texting to be registered. Until this is approved,
your texts may be filtered/blocked.
1. Console → **Messaging → Regulatory Compliance → A2P 10DLC** (or the
   "Regulatory Compliance" / "Trust Hub" area).
2. Create a **Brand** (your business info: legal name, EIN if you have one, address).
3. Create a **Campaign** — use case **"Customer Care"** or **"Low Volume Mixed."**
   For sample messages, paste something like:
   > "Hi Jane, thanks for choosing Steel City Roofing. If you were happy with the
   > work, would you leave us a quick Google review? {{link}}"
4. Attach your phone number to the campaign.
5. Submit. Approval usually takes **1–3 business days**.

> **Shortcut:** A **Toll-Free number** with toll-free verification is often simpler
> for a single agency number. Either path works with this app — you just need one
> SMS-capable number and its E.164 value.

### 5. (Recommended) test
The free trial can only text **verified** numbers. Add your own cell under
**Phone Numbers → Verified Caller IDs** so you can test before upgrading to a paid
account. Upgrade (add a card) before texting real customers.

---

## Part B — Environment variables in Vercel

### 1. Open your project's env settings
Vercel Dashboard → your project → **Settings → Environment Variables**.

### 2. Add these variables
Add each one, and set the environment to **Production** (also tick Preview/Development
if you want them to work there too).

| Name | Value | Notes |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | your `AC…` SID | From the Twilio dashboard |
| `TWILIO_AUTH_TOKEN` | your auth token | Secret — treat like a password |
| `TWILIO_FROM_NUMBER` | `+14125551234` | The number you bought, E.164 format |
| `CRON_SECRET` | a long random string | Protects the daily cron. Generate one below. |

Generate a `CRON_SECRET` (run locally, paste the output):
```bash
openssl rand -hex 32
```

> These join the variables you already have: `NEXT_PUBLIC_SUPABASE_URL`,
> `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
> `LEAD_NOTIFICATION_FROM`, `AGENCY_ADMIN_EMAILS`, `ROOT_DOMAIN`, etc. (see `.env.example`).

### 3. Redeploy
Env var changes only take effect on a new deployment. Either push a commit or, in
Vercel, **Deployments → ⋯ → Redeploy**.

---

## Part C — Database + cron

1. **Run the migrations** in Supabase (SQL editor), in order, at least through:
   - `0013_review_automation.sql` (adds the review-automation fields)
   - `0014_client_tier.sql` (adds the plan tier)
2. **The cron is already configured** in `vercel.json` to run daily at 14:00 UTC
   (`/api/cron/review-requests`). Vercel picks this up automatically on deploy —
   no dashboard setup needed. It sends `CRON_SECRET` as a Bearer token, which the
   route verifies. You can confirm it exists under **Vercel → your project → Cron Jobs**.

---

## Part D — Turn it on for a client

1. Log in as an **agency admin** → **Clients** → open a client.
2. Set their **Plan tier** to **Tier 2 or Tier 3** and save. (Tier 1 never gets
   automated requests.)
3. In that client's **Settings**, make sure **Google review link** is filled in,
   then enable **"Automatically request a Google review when I mark a job Won"** and
   set the delay (default 3 days).
4. Done. When a lead is marked **Won**, the request goes out automatically after the
   delay — by email and text.

---

## How to test end-to-end

1. Set a test client to **Tier 2** and add a Google review link.
2. Create a lead with **your own** email and (Twilio-verified) phone number.
3. Mark it **Won**, then on the lead page click **"Send now by email & text"**
   (bypasses the 3-day wait). You should get both messages.
4. To test the automatic path, you can temporarily set the delay to 0 days and
   trigger the cron manually:
   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://YOUR-DOMAIN/api/cron/review-requests
   ```
   A JSON `{ "ok": true, "sent": N }` response means it ran.

---

## Troubleshooting

- **Texts not arriving:** almost always **10DLC not yet approved**, or the number
  isn't verified (trial accounts can only text verified numbers). Check Twilio →
  **Monitor → Logs → Messaging** for the exact error per message.
- **Email works but SMS doesn't:** the three `TWILIO_*` vars are missing or the app
  wasn't redeployed after adding them. The system sends email-only when Twilio isn't
  configured — no errors.
- **Cron returns 401:** the `CRON_SECRET` in Vercel doesn't match, or you called the
  URL without the Bearer header.
- **Nothing sends automatically:** confirm the client is **Tier 2+**, has a **Google
  review link**, the automation toggle is **on**, and the lead's "won" date is older
  than the delay.
- **No one gets asked twice:** by design — once a request is sent, the lead is stamped
  `review_requested_at` and skipped thereafter.

## Rough costs
- Twilio number: ~$1–2/month. Texts: ~$0.008 each. Resend email: free tier covers
  a lot, then cheap. Vercel Cron: included. A busy client sending 50 review texts/month
  is well under $1 in SMS.
