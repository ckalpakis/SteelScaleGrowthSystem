import { Button } from "@/components/ui";
import { PageHeader, Panel, StatusPill, BoltIcon, PlusIcon } from "@/components/dashboard/reputation/ui";

// Placeholder sample automations — no business logic yet.
const AUTOMATIONS = [
  { name: "Request review when job marked Won", trigger: "Lead status → Won", delay: "3 days later", on: true },
  { name: "Second reminder if no response", trigger: "No review after first request", delay: "5 days later", on: true },
  { name: "Thank-you after 5-star review", trigger: "New 5-star review received", delay: "Immediately", on: false },
];

export default function AutomationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Automations"
        description="Send the right message at the right time — automatically."
        action={
          <Button>
            <PlusIcon className="mr-1.5 h-4 w-4" /> New automation
          </Button>
        }
      />

      <Panel className="!p-0">
        <ul className="divide-y divide-[#f0f0ef]">
          {AUTOMATIONS.map((a) => (
            <li key={a.name} className="flex items-center gap-4 px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <BoltIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[#37352f]">{a.name}</span>
                  <StatusPill tone={a.on ? "green" : "gray"}>{a.on ? "Active" : "Paused"}</StatusPill>
                </div>
                <p className="mt-0.5 text-sm text-[#787774]">
                  {a.trigger} · <span className="text-[#9b9a97]">{a.delay}</span>
                </p>
              </div>
              {/* Toggle (visual only for now) */}
              <span
                className={
                  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors " +
                  (a.on ? "bg-brand" : "bg-[#e0e0de]")
                }
                aria-hidden
              >
                <span
                  className={"inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform " + (a.on ? "translate-x-5" : "translate-x-0.5")}
                />
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
