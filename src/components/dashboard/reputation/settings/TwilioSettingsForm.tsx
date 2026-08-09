"use client";

import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { Panel, StatusPill } from "@/components/dashboard/reputation/ui";
import { useToast } from "@/components/dashboard/reputation/Toast";
import { saveTwilioSettings } from "@/app/dashboard/reputation/settings/actions";
import type { TwilioConfigSummary } from "@/lib/twilio";

export function TwilioSettingsForm({ summary }: { summary: TwilioConfigSummary }) {
  const { toast } = useToast();
  const [accountSid, setAccountSid] = useState(summary.accountSid ?? "");
  const [messagingServiceSid, setMessagingServiceSid] = useState(summary.messagingServiceSid ?? "");
  const [phoneNumber, setPhoneNumber] = useState(summary.phoneNumber ?? "");
  const [authToken, setAuthToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(summary.configured);

  async function save() {
    setSaving(true);
    const res = await saveTwilioSettings({
      accountSid,
      // Empty means "keep the existing token" when already configured.
      authToken: authToken || null,
      messagingServiceSid: messagingServiceSid || null,
      phoneNumber: phoneNumber || null,
    });
    setSaving(false);
    if (!res.ok) {
      toast({ title: "Couldn't save Twilio settings", description: res.error, variant: "error" });
      return;
    }
    toast({ title: "Twilio connected", description: "Your credentials are saved and encrypted.", variant: "success" });
    setConfigured(true);
    setAuthToken(""); // never keep the secret in component state after saving
  }

  return (
    <Panel
      title="SMS · Twilio"
      action={configured ? <StatusPill tone="green">Connected</StatusPill> : <StatusPill tone="gray">Not set up</StatusPill>}
    >
      <p className="mb-4 text-sm text-[#787774]">
        Connect your Twilio account so review requests and reminders text your customers. Your auth
        token is encrypted and never shown again after saving.
      </p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="tw-account">Account SID</Label>
          <Input
            id="tw-account"
            value={accountSid}
            onChange={(e) => setAccountSid(e.target.value)}
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            autoComplete="off"
          />
        </div>

        <div>
          <Label htmlFor="tw-token">Auth Token</Label>
          <Input
            id="tw-token"
            type="password"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder={configured ? "•••••••• (leave blank to keep current)" : "Your Twilio auth token"}
            autoComplete="new-password"
          />
          <p className="mt-1.5 text-xs text-[#9b9a97]">Encrypted at rest. We never display it back.</p>
        </div>

        <div>
          <Label htmlFor="tw-msid">Messaging Service SID</Label>
          <Input
            id="tw-msid"
            value={messagingServiceSid}
            onChange={(e) => setMessagingServiceSid(e.target.value)}
            placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            autoComplete="off"
          />
          <p className="mt-1.5 text-xs text-[#9b9a97]">Recommended. Handles number pools and compliance.</p>
        </div>

        <div>
          <Label htmlFor="tw-phone">Twilio Phone Number</Label>
          <Input
            id="tw-phone"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+14125551234"
            autoComplete="off"
          />
          <p className="mt-1.5 text-xs text-[#9b9a97]">
            Used as the sender if no Messaging Service is set, and to route inbound replies.
          </p>
        </div>


        <div className="flex justify-end border-t border-[#f0f0ef] pt-4">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Twilio settings"}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
