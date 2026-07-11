"use client";

import { useState } from "react";
import { Button, Input, Label, cn } from "@/components/ui";
import { Panel } from "@/components/dashboard/reputation/ui";
import { Tooltip } from "@/components/dashboard/reputation/Tooltip";
import { useToast } from "@/components/dashboard/reputation/Toast";
import { saveReputationSettings } from "@/app/dashboard/reputation/settings/actions";
import {
  DELAY_UNITS,
  splitDelay,
  US_TIMEZONES,
  HOUR_OPTIONS_0_23,
  HOUR_OPTIONS_1_24,
  type ReviewSettingsValues,
} from "@/lib/reputation";

const selectClass =
  "w-full rounded-md border border-[#e0e0de] bg-white px-3 py-2 text-sm text-[#37352f] transition-colors focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15";

export function ReputationSettingsForm({ initial }: { initial: ReviewSettingsValues }) {
  const { toast } = useToast();
  const [values, setValues] = useState<ReviewSettingsValues>(initial);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ReviewSettingsValues>(key: K, value: ReviewSettingsValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  async function save() {
    setSaving(true);
    const res = await saveReputationSettings(values);
    setSaving(false);
    if (res.ok) {
      toast({ title: "Settings saved", description: "Your reputation settings are up to date.", variant: "success" });
    } else {
      toast({ title: "Couldn't save settings", description: res.error, variant: "error" });
    }
  }

  return (
    <div className="space-y-6">
      {/* Business profile */}
      <Panel title="Business profile">
        <div className="space-y-4">
          <div>
            <Label htmlFor="business_name">Business name</Label>
            <Input
              id="business_name"
              value={values.business_name ?? ""}
              onChange={(e) => set("business_name", e.target.value)}
              placeholder="Steel City Roofing"
            />
            <p className="mt-1.5 text-xs text-[#9b9a97]">Used in message merge tags and your review-request signature.</p>
          </div>

          <div>
            <Label htmlFor="google_review_url">Google review URL</Label>
            <Input
              id="google_review_url"
              value={values.google_review_url ?? ""}
              onChange={(e) => set("google_review_url", e.target.value)}
              placeholder="https://g.page/r/…/review"
            />
            <p className="mt-1.5 text-xs text-[#9b9a97]">Where customers are sent to leave a review. Used in tracked links.</p>
          </div>

          <div>
            <Label htmlFor="request_signature">Review request signature</Label>
            <textarea
              id="request_signature"
              value={values.request_signature ?? ""}
              onChange={(e) => set("request_signature", e.target.value)}
              rows={2}
              placeholder="– The team at Steel City Roofing"
              className={cn(selectClass, "resize-none")}
            />
            <p className="mt-1.5 text-xs text-[#9b9a97]">Appended to outgoing review requests.</p>
          </div>
        </div>
      </Panel>

      {/* Automation defaults */}
      <Panel title="Automation defaults">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="default_delay">
              Default delay
              <Tooltip label="How long after a trigger a new workflow waits before its first send.">
                <InfoDot />
              </Tooltip>
            </Label>
            <DelayInput minutes={values.default_delay_minutes} onChange={(m) => set("default_delay_minutes", m)} />
          </div>
          <div>
            <Label htmlFor="default_reminders">Default reminder count</Label>
            <select
              id="default_reminders"
              value={values.default_reminder_count}
              onChange={(e) => set("default_reminder_count", Number(e.target.value))}
              className={selectClass}
            >
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "No reminders" : `${n} reminder${n === 1 ? "" : "s"}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Panel>

      {/* Sending schedule */}
      <Panel title="Sending schedule">
        <div className="space-y-4">
          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <select id="timezone" value={values.timezone} onChange={(e) => set("timezone", e.target.value)} className={selectClass}>
              {US_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>
              SMS sending hours
              <Tooltip label="Texts only send within this window, in your timezone.">
                <InfoDot />
              </Tooltip>
            </Label>
            <div className="flex items-center gap-2">
              <select value={values.sms_send_start_hour} onChange={(e) => set("sms_send_start_hour", Number(e.target.value))} className={selectClass} aria-label="Sending start hour">
                {HOUR_OPTIONS_0_23.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span className="shrink-0 text-sm text-[#9b9a97]">to</span>
              <select value={values.sms_send_end_hour} onChange={(e) => set("sms_send_end_hour", Number(e.target.value))} className={selectClass} aria-label="Sending end hour">
                {HOUR_OPTIONS_1_24.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-[#f0f0ef] p-3">
            <label className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-medium text-[#37352f]">Quiet hours</span>
                <span className="block text-xs text-[#9b9a97]">Never text during this window, even inside sending hours.</span>
              </span>
              <input
                type="checkbox"
                checked={values.quiet_hours_enabled}
                onChange={(e) => set("quiet_hours_enabled", e.target.checked)}
                className="h-4 w-4 rounded border-[#c9c9c7] text-brand focus:ring-brand/30"
              />
            </label>
            {values.quiet_hours_enabled && (
              <div className="mt-3 flex items-center gap-2">
                <select value={values.quiet_start_hour} onChange={(e) => set("quiet_start_hour", Number(e.target.value))} className={selectClass} aria-label="Quiet hours start">
                  {HOUR_OPTIONS_0_23.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <span className="shrink-0 text-sm text-[#9b9a97]">to</span>
                <select value={values.quiet_end_hour} onChange={(e) => set("quiet_end_hour", Number(e.target.value))} className={selectClass} aria-label="Quiet hours end">
                  {HOUR_OPTIONS_0_23.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}

// Number + unit control for the default delay.
function DelayInput({ minutes, onChange }: { minutes: number; onChange: (m: number) => void }) {
  const initial = splitDelay(minutes);
  const [value, setValue] = useState(initial.value);
  const [unit, setUnit] = useState(initial.unit);

  function emit(v: number, u: string) {
    const mult = DELAY_UNITS.find((x) => x.value === u)?.minutes ?? 1;
    onChange(Math.max(0, Math.floor(v)) * mult);
  }

  return (
    <div className="flex gap-2">
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          setValue(v);
          emit(v, unit);
        }}
        className="w-24"
        aria-label="Delay amount"
      />
      <select
        value={unit}
        onChange={(e) => {
          setUnit(e.target.value);
          emit(value, e.target.value);
        }}
        className={selectClass}
        aria-label="Delay unit"
      >
        {DELAY_UNITS.map((u) => (
          <option key={u.value} value={u.value}>
            {u.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function InfoDot() {
  return (
    <span className="ml-1 inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-[#c9c9c7] text-[9px] font-bold text-[#9b9a97]">
      i
    </span>
  );
}
