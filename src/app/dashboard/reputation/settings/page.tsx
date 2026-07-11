import { Button, Input, Label } from "@/components/ui";
import { PageHeader, Panel, StatusPill } from "@/components/dashboard/reputation/ui";

const PLATFORMS = [
  { name: "Google Business Profile", connected: true },
  { name: "Facebook", connected: false },
  { name: "Yelp", connected: false },
];

const NOTIFS = [
  { label: "Email me when a new review comes in", on: true },
  { label: "Email me when a review request is completed", on: true },
  { label: "Weekly reputation summary", on: false },
];

export default function ReputationSettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Configure how your reputation tools work." />

      {/* Connected platforms */}
      <Panel title="Connected platforms">
        <ul className="space-y-3">
          {PLATFORMS.map((p) => (
            <li key={p.name} className="flex items-center justify-between gap-3 rounded-lg border border-[#f0f0ef] px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4f4f3] text-sm font-bold text-[#787774]">
                  {p.name.charAt(0)}
                </span>
                <span className="text-sm font-medium text-[#37352f]">{p.name}</span>
              </div>
              {p.connected ? (
                <div className="flex items-center gap-3">
                  <StatusPill tone="green">Connected</StatusPill>
                  <Button variant="ghost" className="text-xs">Disconnect</Button>
                </div>
              ) : (
                <Button variant="secondary" className="text-xs">Connect</Button>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      {/* Review link */}
      <Panel title="Review link">
        <Label htmlFor="review_link">Google review link</Label>
        <Input id="review_link" placeholder="https://g.page/r/…/review" defaultValue="" />
        <p className="mt-1.5 text-xs text-[#9b9a97]">Where customers are sent to leave a review. Used in requests and templates.</p>
      </Panel>

      {/* Notifications */}
      <Panel title="Notifications">
        <ul className="space-y-3">
          {NOTIFS.map((n) => (
            <li key={n.label} className="flex items-center justify-between gap-3">
              <span className="text-sm text-[#37352f]">{n.label}</span>
              <span
                className={"relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors " + (n.on ? "bg-brand" : "bg-[#e0e0de]")}
                aria-hidden
              >
                <span className={"inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform " + (n.on ? "translate-x-5" : "translate-x-0.5")} />
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="flex justify-end">
        <Button>Save changes</Button>
      </div>
    </div>
  );
}
