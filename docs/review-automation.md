# Automated Google review requests

Per-client automation that asks past customers (leads marked **Won**) for a Google
review — by **email and text** — a few days after the job.

## How it works
1. In the client's **Settings → Automated review requests**, turn on
   *"Automatically request a Google review when I mark a job Won"* and set the delay
   (default **3 days**). A Google review link must be set.
2. When a lead is moved to **Won**, the system stamps `won_at`.
3. A **daily cron** (`/api/cron/review-requests`, scheduled in `vercel.json` at 14:00 UTC)
   finds Won leads whose `won_at` is older than the delay and that haven't been asked yet,
   and sends each one a review request via every available channel (email if there's an
   email, text if there's a phone + Twilio is configured). It stamps `review_requested_at`
   so no one is asked twice.

## Manual sends
- **One customer:** on a lead's page, *"Send now by email & text."*
- **All past customers at once:** the **Request Reviews** button on the Leads page sends to
  every Won customer who hasn't been asked yet (great for turning the system on with a backlog).

## Setup
- **Email** works with the existing Resend config — nothing to add.
- **SMS** needs a Twilio account. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and
  `TWILIO_FROM_NUMBER`. One agency Twilio number texts on behalf of all clients; the client's
  business name is written into the message. For production US texting you must complete
  Twilio **A2P 10DLC registration** for the number.
- **Cron:** set `CRON_SECRET` in Vercel (Vercel Cron sends it as a Bearer token, which the
  route verifies). The schedule lives in `vercel.json`.

## Message
Uses a proven default, or the client's custom message with placeholders:
`{{name}}` (customer first name), `{{business}}`, `{{link}}` (Google review link).

## Compliance note
Ask every completed customer the same way. Don't "review-gate" (screening for happy
customers only) or offer incentives — that violates Google's policy and can get reviews removed.

## Database
Migration `0013_review_automation.sql` adds `leads.won_at`, `leads.review_requested_at`,
and `client_settings.auto_review_enabled / auto_review_delay_days / review_request_message`.
