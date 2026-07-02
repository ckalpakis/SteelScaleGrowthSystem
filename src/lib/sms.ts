// Twilio SMS sender. Dependency-free — calls the Twilio REST API directly so we
// don't pull in the SDK. Fails soft: if Twilio isn't configured or the send
// errors, we log and return false; a missed text should never crash a flow.
//
// Agency-level credentials (one Twilio account sends on behalf of every client;
// the client's business name is written into the message body):
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER

export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
  );
}

// Normalize a US-style number to E.164 (+1XXXXXXXXXX). Returns null if it
// doesn't look like a valid number we can text.
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits.length >= 11 ? digits : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    console.warn("[sms] Twilio not configured — skipping");
    return false;
  }
  const dest = toE164(to);
  if (!dest) {
    console.warn(`[sms] invalid destination number — skipping`);
    return false;
  }

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: dest, From: from, Body: body }).toString(),
    });
    if (!res.ok) {
      console.error("[sms] Twilio send failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[sms] Twilio request errored", err);
    return false;
  }
}
