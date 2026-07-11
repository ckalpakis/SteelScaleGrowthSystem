import { Button } from "@/components/ui";
import { PageHeader, StatCard, Panel, StatusPill, SendIcon, PlusIcon } from "@/components/dashboard/reputation/ui";

const FILTERS = ["All", "Pending", "Sent", "Opened", "Completed"];

// Placeholder sample rows — no business logic yet.
const REQUESTS = [
  { name: "Karen Mitchell", channel: "SMS", sent: "Jul 2, 2:14 PM", status: "Completed" as const },
  { name: "Dave Robertson", channel: "Email", sent: "Jun 28, 9:02 AM", status: "Opened" as const },
  { name: "Priya Shah", channel: "SMS", sent: "Jun 24, 4:41 PM", status: "Sent" as const },
  { name: "Tom Becker", channel: "Email", sent: "—", status: "Pending" as const },
];

const TONE = { Completed: "green", Opened: "blue", Sent: "amber", Pending: "gray" } as const;

export default function ReviewRequestsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Requests"
        description="Send and track requests that turn happy customers into reviews."
        action={
          <Button>
            <PlusIcon className="mr-1.5 h-4 w-4" /> New request
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sent" value="96" icon={<SendIcon className="h-4 w-4" />} />
        <StatCard label="Opened" value="61" icon={<SendIcon className="h-4 w-4" />} trend="64% open rate" />
        <StatCard label="Clicked" value="42" icon={<SendIcon className="h-4 w-4" />} />
        <StatCard label="Reviews" value="33" icon={<SendIcon className="h-4 w-4" />} trend="34% conversion" trendUp />
      </div>

      {/* Filter segmented control (visual only) */}
      <div className="inline-flex flex-wrap gap-1 rounded-lg border border-[#e0e0de] bg-white p-0.5">
        {FILTERS.map((f, i) => (
          <button
            key={f}
            className={
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
              (i === 0 ? "bg-brand text-white" : "text-[#787774] hover:bg-black/[0.04]")
            }
          >
            {f}
          </button>
        ))}
      </div>

      <Panel className="overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[#f0f0ef] bg-[#fafafa] text-left text-xs uppercase tracking-wide text-[#9b9a97]">
              <tr>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Channel</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">Sent</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0ef]">
              {REQUESTS.map((r, i) => (
                <tr key={i} className="transition-colors hover:bg-[#fafafa]">
                  <td className="px-5 py-3 font-medium text-[#37352f]">{r.name}</td>
                  <td className="px-5 py-3 text-[#787774]">{r.channel}</td>
                  <td className="hidden px-5 py-3 text-[#787774] sm:table-cell">{r.sent}</td>
                  <td className="px-5 py-3">
                    <StatusPill tone={TONE[r.status]}>{r.status}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
