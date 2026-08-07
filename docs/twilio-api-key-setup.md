# Twilio API Key + Messaging Service Setup

The review/onboarding system sends SMS using **API‑Key authentication** through a
**Messaging Service** (not the legacy Auth Token + "from number"). This guide
creates the four values it needs:

```
TWILIO_ACCOUNT_SID            AC…   (your account id)
TWILIO_API_KEY                SK…   (API Key SID)
TWILIO_API_SECRET             …     (API Key secret — shown once)
TWILIO_MESSAGING_SERVICE_SID  MG…   (the Messaging Service that holds your numbers)
```

> **Security:** the API Key secret is shown **once** and is a password‑equivalent.
> Copy it straight into Vercel; never paste it into chat, commit it, or log it.

> Twilio occasionally moves menus. If a label differs, the value's **prefix**
> (`AC…`, `SK…`, `MG…`) tells you you've got the right one.

---

## 1. Get your Account SID

1. Sign in at **https://console.twilio.com/**.
2. On the **Account Dashboard** (home), find **Account SID** — it starts with
   `AC…`. Copy it → `TWILIO_ACCOUNT_SID`.

## 2. Create a Standard API Key

**► Where:** top‑right account menu → **Account → API keys & tokens** (direct:
**https://console.twilio.com/us1/account/keys-credentials/api-keys**).

1. Click **Create API key**.
2. **Friendly name:** e.g. `steel-scale-sms`.
3. **Region:** US1 (unless your account is elsewhere).
4. **Key type: Standard** (Standard can send messages; Restricted is more work,
   Main is discouraged).
5. Click **Create**.
6. Twilio now shows two values **once**:
   - **SID** (`SK…`) → `TWILIO_API_KEY`
   - **Secret** → `TWILIO_API_SECRET`
   Copy **both now** — the Secret is never shown again. If you lose it, delete the
   key and make a new one.

## 3. Create / confirm a Messaging Service

**► Where:** left nav → **Messaging → Services** (direct:
**https://console.twilio.com/us1/service/sms/services**).

1. Click **Create Messaging Service** (or open your existing one).
2. **Name** it (e.g. `Steel Scale Review Sends`) and pick a use case
   (e.g. *Notify my users* / marketing‑style, per your campaign).
3. **Add senders → Phone Number:** add the number(s) you want to send from into
   the **Sender Pool**. (For "one pool for all clients," add all your numbers
   here; Twilio picks one per recipient.)
4. Finish the wizard. Open the Service → **copy its SID** (`MG…`) →
   `TWILIO_MESSAGING_SERVICE_SID`.

## 4. Attach the Messaging Service to your A2P 10DLC campaign

US A2P texting requires your numbers to be under a registered **A2P campaign**.

1. **Messaging → Regulatory Compliance → A2P 10DLC** — make sure your **Brand**
   and **Campaign** are **approved**.
2. Ensure the **Messaging Service** from step 3 is linked to that campaign (the
   campaign registration step associates a Messaging Service). Without this,
   carriers will filter or block your sends.

> A2P brand/campaign approval can take time. This is the wait you avoid *per
> client* by sending everything through this one approved Service.

## 5. Put the values in Vercel and redeploy

**Project → Settings → Environment Variables** — add all four, then **redeploy**:

```
TWILIO_ACCOUNT_SID=AC…
TWILIO_API_KEY=SK…
TWILIO_API_SECRET=…
TWILIO_MESSAGING_SERVICE_SID=MG…
```

(Set them for the **Production** environment — matching where your app runs.)

## 6. Verify

- Open a client's **Webhook setup** page → **Test Configuration** (dry run). The
  "messaging configured" check should pass.
- Then **Send a real test** to a number you own and have opted in. You should
  receive the text from one of your Messaging Service numbers.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Test shows **"messaging not configured"** | One of the four vars missing/typo, or not redeployed | Re‑check all four in Vercel Production; redeploy |
| **20003 Authenticate** error | Wrong API Key/Secret, or Secret truncated | Recreate the Standard API Key (step 2); re‑copy the Secret |
| **63016 / carrier filtered** | Messaging Service not attached to an approved A2P campaign | Complete step 4 (A2P brand + campaign, link the Service) |
| **21704** Messaging Service has no senders | Sender Pool empty | Add a number to the Service's Sender Pool (step 3.3) |
| Message sends but from an unexpected number | Shared pool picks a number per recipient | Expected with one shared Service; use the per‑client sender build if you want dedicated numbers |

## Phone line‑type check (admin tool)

Once the credentials above are set, admins get a **Phone check** tool at
**`/dashboard/tools/phone-lookup`** (in the sidebar). Paste up to 100 numbers to
see whether each is **mobile / landline / VoIP** (via Twilio Lookup — Line Type
Intelligence), and one‑click **copy the mobile numbers** to scrub a list before a
campaign. Each lookup is a small billable Twilio request (~$0.005). It uses the
same `TWILIO_ACCOUNT_SID` / `TWILIO_API_KEY` / `TWILIO_API_SECRET` — no extra
setup.

## Related docs
- `docs/setup-twilio-and-vercel.md` — the older Auth‑Token single‑account flow (legacy)
- `docs/COMPLETE-SETUP-GUIDE.md` — full platform + onboarding setup
- `docs/ghl-setup-guide.md` — the GHL‑side review workflow + webhook
