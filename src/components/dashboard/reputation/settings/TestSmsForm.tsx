"use client";

import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { Panel } from "@/components/dashboard/reputation/ui";
import { useToast } from "@/components/dashboard/reputation/Toast";
import { sendTestSms } from "@/app/dashboard/reputation/settings/actions";

// Send a test SMS to confirm the Twilio connection works end-to-end.
export function TestSmsForm({ configured }: { configured: boolean }) {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!phone.trim()) return;
    setSending(true);
    const res = await sendTestSms(phone.trim());
    setSending(false);
    if (res.ok) {
      toast({ title: "Test message sent", description: `Check ${phone.trim()} for the text.`, variant: "success" });
    } else {
      toast({ title: "Test failed", description: res.error, variant: "error" });
    }
  }

  return (
    <Panel title="Test your SMS">
      <p className="mb-4 text-sm text-[#787774]">
        Send a quick test to make sure your Twilio connection is working.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor="test_phone">Your phone number</Label>
          <Input
            id="test_phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+14125551234"
            disabled={!configured}
          />
        </div>
        <Button onClick={send} disabled={sending || !configured || !phone.trim()}>
          {sending ? "Sending…" : "Send test"}
        </Button>
      </div>
      {!configured && <p className="mt-2 text-xs text-amber-600">Connect Twilio above before sending a test.</p>}
    </Panel>
  );
}
