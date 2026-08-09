# GHL Setup Guide (Review Request System)

This is the **in‑depth, GHL‑side** guide for standing up the Steel Scale review
request system inside GoHighLevel. It covers the one‑time agency setup, the
per‑client setup, and exactly how to wire the review workflow's **Custom
Webhook** so GHL triggers the text and **your** app sends it.

> **How sending actually works (read this first).**
> GHL does **not** send the review text. GHL runs the workflow and, at each
> stage, calls a **Custom Webhook** on your app. Your app authenticates the
> call, looks up the business name + review link from **its own record** (never
> from what GHL sends), and sends the SMS through **your Twilio**. So GHL is the
> *trigger*, your app is the *sender*.
>
> ```
> GHL workflow  →  Custom Webhook (POST)  →  your app  →  your Twilio  →  customer
> ```
>
> Because of this, you do **not** need LC Phone to send review requests. LC Phone
> is only relevant if you want a per‑client number for **replies** inside GHL
> (see §7).

Related docs: `docs/onboarding-system-guide.md` (the dashboard side),
`docs/ghl-authentication-setup.md` (API credentials/scopes).

---

## Part A — One‑time agency setup (do this once)

### A1. Get your Agency / Company ID
In GHL, go to **Agency Settings → Company** and copy the **Company ID**. Put it
in `GHL_COMPANY_ID`. (Provisioning uses it to create sub‑accounts.)

### A2. Give your app API access
Follow `docs/ghl-authentication-setup.md` to create either an OAuth app
(recommended) or a Private Integration Token, granting these scopes:

| Capability | Scope |
| --- | --- |
| Read/create sub‑accounts (locations) | `locations.readonly`, `locations.write` |
| Read/update location custom values | `locations/customValues.readonly`, `locations/customValues.write` |
| List snapshots | `snapshots.readonly` |

Set the resulting values in your environment (`GHL_CLIENT_ID/SECRET/ACCESS_TOKEN`
… or `GHL_PRIVATE_INTEGRATION_TOKEN`) and list them in `GHL_GRANTED_SCOPES`.

### A3. Build the "Steel Scale review snapshot"
The snapshot is the template every client sub‑account is built from. It must
contain **two things** the system depends on:

**(a) The custom values** the system writes to. Create a custom value in the
snapshot for each key below. The **key name must match exactly** (these include
some legacy names — match them literally):

| What it holds | Exact GHL custom value key | Required |
| --- | --- | --- |
| Google review link | `google_review_link` | ✅ |
| Logo image URL | `logo_link` | ✅ |
| Secondary image (optional placeholder) | `text_1_image_link` | — |
| Owner first name | `business_owner_name` | ✅ |
| Public business name | `business_name` | ✅ |
| Email sending subdomain | `9_email_sending_subdomain_after_the_` | ✅ |
| Min review requests / 14 days | `minimum_review_requests_per_14_days` | ✅ |
| Follow‑up count (written to legacy key) | `service_type` | ✅ |
| Review requests / 14 days | `review_requests_per_14_days` | ✅ |
| Ask for a referral (Yes/No) | `10_ask_for_a_referral_if_customer_has_already_left_a_review_yes_or_no` | ✅ |

> Provisioning fills these automatically after the snapshot is loaded. If any
> **required** key is missing/misnamed, provisioning parks at **Needs action**
> with a "missing custom values" task — so getting these exact is important.

**(b) The review workflow** with four stages (see Part C). You can build the
workflow inside the snapshot so it comes pre‑loaded, then just paste the webhook
config per client (§6). The four stages are: **initial**, **follow‑up 1**,
**follow‑up 2**, **follow‑up 3**.

### A4. Record the snapshot name/ID
Copy the snapshot's **name** (and ID if available) into
`GHL_REVIEW_SNAPSHOT_NAME` / `GHL_REVIEW_SNAPSHOT_ID`. Provisioning references
these when it creates the "Load snapshot" task.

---

## Part B — Per‑client setup (repeat for each client)

### B1. Onboard the client (creates the sub‑account)
You do **not** create the sub‑account by hand. When the client completes the
**Business setup** form, provisioning creates the GHL location automatically.
Watch it at **Dashboard → Onboarding → (client)**.

### B2. Load the snapshot into the sub‑account (the one manual GHL step)
Provisioning parks at **Needs action** with a task titled **"Load Steel Scale
review snapshot"** (there is no public GHL API to push a snapshot). To do it:

1. Switch to **Agency View** (top‑left account switcher → your agency).
2. Go to **Account Snapshots** (Agency Settings → **Account Snapshots**).
3. Find your review snapshot → **Push/Load to a sub‑account**.
4. Select the client's location (the task shows the **location ID**).
5. Push it and wait for GHL to finish applying.
6. Back in your dashboard, open the task and click **Mark snapshot complete**.

That resumes provisioning: it discovers the custom values the snapshot created,
fills them from the client's record, verifies them, and generates the webhook
credential.

### B3. Confirm custom values (automatic)
After the snapshot, provisioning writes every custom value from §A3 using the
client's onboarding data. You can spot‑check them in the sub‑account under
**Settings → Custom Values**. If something didn't match, use **Re‑run value
sync** on the client detail page.

### B4. Wire the review workflow webhook → **this is the core step** (§6)

---

## Part C — How the review workflow is structured (in GHL)

If you're building/adjusting the workflow (rather than relying on the snapshot),
lay it out like this. The **only** action that talks to Steel Scale is the
**Custom Webhook** at each stage.

```
Trigger:  (your choice — e.g. Opportunity status = Won, or a "Request Review" tag)
   │
   ├─ Wait: <initial delay, e.g. 1 hour>
   ├─ Custom Webhook  ── stage: initial          ← calls your app
   │
   ├─ Wait: <e.g. 3 days>   (+ optional "if not reviewed" condition)
   ├─ Custom Webhook  ── stage: follow_up_1
   │
   ├─ Wait: <e.g. 3 days>
   ├─ Custom Webhook  ── stage: follow_up_2
   │
   ├─ Wait: <e.g. 4 days>
   └─ Custom Webhook  ── stage: follow_up_3
```

- **Stop conditions / "already reviewed"** logic lives in GHL (e.g. remove from
  workflow when a review is detected, or on reply). Your app is stateless per
  call — it just sends when told to.
- The **number of follow‑ups** you configure in onboarding is informational for
  your records; the actual cadence is whatever the GHL workflow does. Keep them
  in sync (if a client chose 2 follow‑ups, disable stage 3 in their workflow).

---

## Part 6 — Configure the Custom Webhook (per stage)

Your dashboard **generates all of this for you**: open **Onboarding → (client) →
Webhook setup**. It shows the URL, headers, the one‑time secret, and the four
ready‑to‑paste JSON payloads. This section explains each field so you know what
you're pasting.

### 6.1 Get the secret (once)
On the Webhook setup page click **Generate/Rotate secret** and **copy it now** —
it is shown once. This is the per‑client `X-SteelScale-Webhook-Secret`.

### 6.2 In GHL, for **each** of the four workflow stages:

1. Open the workflow → open the stage's step.
2. Replace the **Send SMS** action with a **Custom Webhook** (aka **Webhook**)
   action.
3. **Method:** `POST`
4. **URL:**
   ```
   https://<YOUR_APP_DOMAIN>/api/workflow/review
   ```
   (This is `NEXT_PUBLIC_APP_URL` + `/api/workflow/review`. The dashboard prints
   the exact URL.)
5. **Headers** (add two):
   | Key | Value |
   | --- | --- |
   | `Content-Type` | `application/json` |
   | `X-SteelScale-Webhook-Secret` | *(the one‑time secret from 6.1)* |
6. **Body:** paste that stage's JSON (copy from the dashboard). It looks like:
   ```json
   {
     "eventVersion": "1.0",
     "eventType": "review_request.initial",
     "idempotencyKey": "{{location.id}}:{{contact.id}}:initial:{{workflow.id}}",
     "locationId": "{{location.id}}",
     "contactId": "{{contact.id}}",
     "firstName": "{{contact.first_name}}",
     "lastName": "{{contact.last_name}}",
     "phone": "{{contact.phone}}",
     "email": "{{contact.email}}"
   }
   ```
   The only thing that changes between stages is `eventType` and the
   `idempotencyKey` suffix:
   | Stage | `eventType` | idempotency suffix |
   | --- | --- | --- |
   | Initial | `review_request.initial` | `initial` |
   | Follow‑up 1 | `review_request.follow_up_1` | `follow-up-1` |
   | Follow‑up 2 | `review_request.follow_up_2` | `follow-up-2` |
   | Follow‑up 3 | `review_request.follow_up_3` | `follow-up-3` |
7. **Save** the action. Repeat for all four stages.

> **Why the payload has no business name / review link:** your app resolves those
> from its own record using the authenticated `locationId`. This means a client
> can't be tricked into texting the wrong link, and you can correct a review link
> in the dashboard without editing GHL.

### 6.3 Merge‑field reference
| Payload field | GHL merge field | Notes |
| --- | --- | --- |
| `locationId` | `{{location.id}}` | Authenticates which client this is |
| `contactId` | `{{contact.id}}` | For logging/idempotency |
| `firstName` | `{{contact.first_name}}` | Used in the message greeting |
| `lastName` | `{{contact.last_name}}` | Optional |
| `phone` | `{{contact.phone}}` | Destination number (E.164 preferred) |
| `email` | `{{contact.email}}` | Optional |
| `idempotencyKey` | composed of the above | Prevents duplicate sends on retry |

---

## Part 7 — (Optional) LC Phone for replies

Review **sends** go through your Twilio, so LC Phone isn't required. But if you
want the client to see and answer **replies** inside GHL conversations, buy an
**LC Phone** number in that sub‑account:

1. Sub‑account → **Settings → Phone Numbers → Add Number** (LC Phone).
2. Complete A2P/brand registration as GHL prompts.

Be aware the outbound review text (from your Twilio) and the LC Phone reply
number will be **different numbers**. If you want the send *and* replies on one
per‑client number, that's the "send natively via LC Phone" model — which bypasses
your app's webhook/MMS/tracking logic and would need the workflow to use a native
**Send SMS** action instead of the Custom Webhook. Ask if you want that path.

---

## Part 8 — Test, then go live

### 8.1 Send a controlled test from GHL
1. Add a **designated, opted‑in** test contact (a number you own).
2. Manually enroll it in the workflow (or trigger the initial stage).
3. Confirm the text arrives.

### 8.2 Dry‑run validation in your dashboard
On **Onboarding → (client) → Webhook setup**, click **Test Configuration**. It
checks (without sending): secret matches, location resolves, client is active,
review link present, messaging configured. Fix any ❌ before activating.

### 8.3 Activate
Turn the GHL workflow **Publish/On** only after a clean test.

---

## Part 9 — Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Webhook returns **401** | Secret missing/wrong, or credential disabled, or wrong location | Re‑copy the header value; **Rotate secret** in the dashboard and re‑paste; confirm the workflow runs in the right sub‑account |
| **400 invalid_payload** | A merge field is blank or the JSON is malformed | Ensure the contact has first name + phone; re‑paste the exact JSON |
| **503 not configured** | Twilio env vars missing | Set `TWILIO_ACCOUNT_SID/API_KEY/API_SECRET/MESSAGING_SERVICE_SID` |
| Nothing sends, no error | Client not **active**, or no review link | Finish provisioning; confirm review link on the client page |
| Duplicate texts | Two stages share an idempotency suffix | Give each stage its own suffix (table in §6.2) |
| Provisioning stuck at **Needs action** | Snapshot not loaded, or a custom value didn't match | Load snapshot + **Mark complete**, or fix the value and **Re‑run value sync** |

---

## Quick per‑client checklist

- [ ] Client completed **Business setup**; provisioning created the sub‑account
- [ ] Snapshot pushed to the sub‑account (Agency View) → **Mark snapshot complete**
- [ ] Custom values populated (auto) — spot‑checked
- [ ] Webhook secret generated (copied once)
- [ ] Custom Webhook configured on all 4 workflow stages (URL + 2 headers + JSON)
- [ ] Controlled test text received
- [ ] **Test Configuration** dry‑run all green
- [ ] Workflow published
- [ ] (Optional) LC Phone number added for replies
