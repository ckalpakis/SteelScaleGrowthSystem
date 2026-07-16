# Connecting GoHighLevel to the Review Webhook

This guide explains **exactly** how to configure GoHighLevel (GHL) to send a
review-request text through Steel Scale.

There is **no OAuth and no API integration**. GoHighLevel simply **POSTs a JSON
payload** to our webhook, and our backend sends the SMS through Twilio.

```
GoHighLevel Workflow
        │
        ▼
   Custom Webhook  (POST, application/json)
        │
        ▼
   https://<your-app-domain>/api/review
        │
        ▼
   Twilio Messaging Service
        │
        ▼
      Customer
```

---

## 1. The endpoint

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `https://<your-app-domain>/api/review` |
| **Header** | `Content-Type: application/json` |
| **Auth** | None |

> Replace `<your-app-domain>` with your **actual deployed domain** (for example
> `https://app.steelscale.xyz/api/review`). This must be the live production URL —
> GoHighLevel calls it from Google's servers, not from your browser.

A successful call returns:

```json
{ "success": true, "messageSid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
```

---

## 2. Create the Custom Values in GoHighLevel

Four pieces of data come from your **sub-account (location) settings**, not from
the contact: the business name, the review link, and (optionally) the owner name
and images. In GoHighLevel these are called **Custom Values**.

1. In the sub-account, go to **Settings → Custom Values**.
2. Click **+ Add Custom Value** and create each of these:

| Custom Value name | Example value | Required? |
|---|---|---|
| **Business Name** | `Smile Dental` | ✅ Required |
| **Google Review Link** | `https://g.page/r/xxxxxxxx/review` | ✅ Required |
| **Business Owner** | `Marc` | Optional |
| **Logo** | `https://.../logo.png` | Optional |
| **Review Image** | `https://.../image.png` | Optional |

3. GoHighLevel turns each name into a merge field automatically, lower-cased with
   underscores — e.g. **Business Name** → `{{ custom_values.business_name }}`.
   You never type these by hand; you'll insert them from the picker in Step 4.

> **Why custom values?** They're set once per client/location. Every contact that
> runs through the workflow reuses the same business name and review link.

---

## 3. Build the Workflow

1. Go to **Automation → Workflows → + Create Workflow** (or open an existing one).
2. **Add a Trigger** — whatever should start the review request. Common choices:
   - *Opportunity Status Changed* → **Won**
   - *Tag Added* → e.g. `send-review`
   - *Appointment Status* → **Showed / Completed**
3. Click **+** to add an **Action** and choose **Webhook** (also labeled
   **Custom Webhook**).

---

## 4. Configure the Custom Webhook action

Set the fields on the webhook action:

- **Method:** `POST`
- **URL:** `https://<your-app-domain>/api/review`
- **Headers:** add one header —
  - Key: `Content-Type`
  - Value: `application/json`
- **Body / Payload:** choose **JSON** (raw) and paste the payload below.

### Complete payload — paste this into the Body

```json
{
  "contactId": "{{contact.id}}",
  "firstName": "{{contact.first_name}}",
  "lastName": "{{contact.last_name}}",
  "phone": "{{contact.phone}}",
  "email": "{{contact.email}}",
  "businessName": "{{custom_values.business_name}}",
  "businessOwner": "{{custom_values.business_owner}}",
  "reviewLink": "{{custom_values.google_review_link}}",
  "logo": "{{custom_values.logo}}",
  "image": "{{custom_values.review_image}}",
  "messageType": "initial"
}
```

> **Important:** Don't hand-type the `{{ ... }}` fields. Delete the placeholder
> text between the quotes and use GoHighLevel's **merge-field picker** (the
> `{}` / "Custom Values" button in the body editor) to insert each one. That
> guarantees the exact field name your sub-account uses. Keep the surrounding
> quotes and commas so the JSON stays valid.

---

## 5. What every field means

| JSON field | GHL merge field | Required | Purpose |
|---|---|---|---|
| `contactId` | `{{contact.id}}` | No | GHL's contact id (logging/reference only). |
| `firstName` | `{{contact.first_name}}` | ✅ **Yes** | Used in the greeting ("Hi John,"). |
| `lastName` | `{{contact.last_name}}` | No | Accepted but not used in the current message. |
| `phone` | `{{contact.phone}}` | ✅ **Yes** | The destination number. Must be a real, valid number. |
| `email` | `{{contact.email}}` | No | Accepted; not used to send. |
| `businessName` | `{{custom_values.business_name}}` | ✅ **Yes** | Shown in the message ("Thanks for choosing …"). |
| `businessOwner` | `{{custom_values.business_owner}}` | No | Accepted; reserved for future templates. |
| `reviewLink` | `{{custom_values.google_review_link}}` | ✅ **Yes** | The link the customer taps. **Must be a valid URL.** |
| `logo` | `{{custom_values.logo}}` | No | Accepted; reserved for future rich messages. |
| `image` | `{{custom_values.review_image}}` | No | Accepted; reserved for future rich messages. |
| `messageType` | *(static text)* `initial` | No | Leave as the literal string `initial`. |

**The four required fields** are `firstName`, `phone`, `businessName`, and
`reviewLink`. If any is empty (e.g. a custom value you forgot to fill in), the
webhook returns a `400` and no text is sent.

### The resulting text message

With `firstName = John`, `businessName = Smile Dental`, and
`reviewLink = https://g.page/r/abc/review`, the customer receives:

```
Hi John,

Thanks for choosing Smile Dental.

Would you mind leaving us a quick review?

https://g.page/r/abc/review

Reply STOP to opt out.
```

---

## 6. Test it inside GoHighLevel

1. **Save** the workflow and toggle it from **Draft → Publish**.
2. In the Custom Webhook action, GoHighLevel shows a **Test** section. Pick a
   **test contact that has a real mobile number** (ideally your own), then click
   **Run Test** / **Test Action**.
3. GoHighLevel displays the **response** from our server. You want:
   - **Status `200`**
   - Body `{ "success": true, "messageSid": "SM..." }`
4. Your phone should receive the review-request text within a few seconds.
5. For an end-to-end test, actually trigger the workflow (e.g. move a test
   opportunity to **Won**, or add the trigger tag to a test contact) and confirm
   the SMS arrives. Check **Contacts → the contact → Workflow / Automation
   history** to see the run.

---

## 7. Troubleshooting (response codes)

The server always replies with clean JSON, so the webhook's test panel tells you
exactly what happened:

| Status | Body `error` | Cause | Fix |
|---|---|---|---|
| `200` | — | Success. | 🎉 |
| `400` | `Validation failed.` | A required field was empty. The `details` array names the field (`firstName`, `businessName`, or `reviewLink`). | Fill in the missing contact field or custom value. |
| `400` | `reviewLink must be a valid URL` | The review link custom value isn't a full URL. | Use the complete `https://…` review link. |
| `400` | `Invalid phone number.` | The contact has no phone, or the number isn't valid. | Ensure the contact has a valid mobile number. |
| `400` | `Invalid JSON body.` | The payload isn't valid JSON (usually a value with a stray quote/newline broke it). | Re-insert fields via the picker; keep quotes/commas intact. |
| `500` | `SMS service is not configured.` | Twilio env vars aren't set on the server. | A Steel Scale admin sets the `TWILIO_*` variables. Not a GHL issue. |
| `502` | `Failed to send message.` | Twilio rejected the send (bad number, unverified messaging service, etc.). The `code` field is Twilio's error code. | Look up the Twilio `code`; often an invalid/unreachable number. |

---

## 8. Recap checklist

- [ ] Custom Values created and filled: **Business Name**, **Google Review Link** (required); owner/logo/image (optional).
- [ ] Workflow has a trigger.
- [ ] Custom Webhook action: **POST**, correct **URL**, `Content-Type: application/json` header.
- [ ] Body pasted, merge fields inserted via the picker.
- [ ] Workflow **Published**.
- [ ] Test returned **200** and the SMS arrived.

That's the entire setup. GoHighLevel posts the payload, our backend validates it
and sends the text through Twilio — no API keys or OAuth on the GoHighLevel side.
