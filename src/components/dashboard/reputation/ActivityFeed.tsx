import { cn } from "@/components/ui";
import { SendIcon, StarIcon, BoltIcon } from "@/components/dashboard/reputation/ui";

// Reusable activity feed for the Reputation module.
export type ActivityType =
  | "request_sent"
  | "clicked"
  | "review_received"
  | "sms_failed"
  | "workflow_started";

export interface Activity {
  type: ActivityType;
  title: string;
  description?: string;
  time: string;
}

const CONFIG: Record<ActivityType, { icon: React.ReactNode; tone: string }> = {
  request_sent: { icon: <SendIcon className="h-4 w-4" />, tone: "bg-blue-50 text-blue-600" },
  clicked: { icon: <CursorIcon className="h-4 w-4" />, tone: "bg-indigo-50 text-indigo-600" },
  review_received: { icon: <StarIcon className="h-4 w-4" filled />, tone: "bg-amber-50 text-amber-500" },
  sms_failed: { icon: <AlertIcon className="h-4 w-4" />, tone: "bg-red-50 text-red-600" },
  workflow_started: { icon: <BoltIcon className="h-4 w-4" />, tone: "bg-green-50 text-green-600" },
};

export function ActivityFeed({ items }: { items: Activity[] }) {
  return (
    <ul className="space-y-1">
      {items.map((a, i) => {
        const c = CONFIG[a.type];
        return (
          <li key={i} className="flex gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[#fafafa]">
            <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", c.tone)}>
              {c.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-[#37352f]">{a.title}</span>
                <span className="shrink-0 text-xs text-[#9b9a97]">{a.time}</span>
              </div>
              {a.description && <p className="mt-0.5 text-sm text-[#787774]">{a.description}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function CursorIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M5 3l6 18 2.5-7L21 11 5 3z" strokeLinejoin="round" />
    </svg>
  );
}
function AlertIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 8v5M12 16.5h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
