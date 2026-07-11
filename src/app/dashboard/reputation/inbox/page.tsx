import { PageHeader, StatusPill, Stars, ChatIcon } from "@/components/dashboard/reputation/ui";

// Placeholder sample conversations — no business logic yet.
const THREADS = [
  { name: "Karen Mitchell", channel: "SMS", snippet: "Thank you! I just left the review 🙂", time: "2m", unread: true, active: true },
  { name: "Dave Robertson", channel: "Email", snippet: "Sure, where do I click to leave it?", time: "1h", unread: true, active: false },
  { name: "Priya Shah", channel: "SMS", snippet: "Will do this weekend, thanks!", time: "3h", unread: false, active: false },
  { name: "Google Review · Tom B.", channel: "Review", snippet: "★★★★★ Best in Pittsburgh — fast and fair.", time: "1d", unread: false, active: false },
];

export default function InboxPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Inbox" description="Every review reply and request conversation in one place." />

      <div className="grid gap-4 overflow-hidden rounded-xl border border-[#ededec] bg-white shadow-[0_1px_2px_rgba(15,15,15,0.04)] lg:grid-cols-[320px_1fr] lg:gap-0">
        {/* Conversation list */}
        <div className="lg:border-r lg:border-[#f0f0ef]">
          <div className="border-b border-[#f0f0ef] px-4 py-3">
            <span className="text-sm font-semibold text-[#37352f]">Conversations</span>
          </div>
          <ul className="divide-y divide-[#f0f0ef]">
            {THREADS.map((t) => (
              <li
                key={t.name}
                className={"flex cursor-pointer gap-3 px-4 py-3 transition-colors hover:bg-[#fafafa] " + (t.active ? "bg-[#f4f6fb]" : "")}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                  {t.name.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-[#37352f]">{t.name}</span>
                    <span className="shrink-0 text-xs text-[#9b9a97]">{t.time}</span>
                  </div>
                  <p className="truncate text-sm text-[#787774]">{t.snippet}</p>
                </div>
                {t.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
              </li>
            ))}
          </ul>
        </div>

        {/* Message pane */}
        <div className="hidden min-h-[420px] flex-col lg:flex">
          <div className="flex items-center justify-between border-b border-[#f0f0ef] px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#37352f]">Karen Mitchell</span>
              <StatusPill tone="blue">SMS</StatusPill>
            </div>
            <Stars value={5} />
          </div>
          <div className="flex-1 space-y-3 bg-[#fafafa] p-5">
            <Bubble side="in">Hi Karen! Thanks for choosing us. Would you mind leaving a quick review? {"{{link}}"}</Bubble>
            <Bubble side="out">Just left it — 5 stars! You guys were great.</Bubble>
            <Bubble side="in">That means a lot, thank you! 🙌</Bubble>
          </div>
          <div className="border-t border-[#f0f0ef] p-4">
            <div className="flex items-center gap-2 rounded-lg border border-[#e0e0de] px-3 py-2 text-sm text-[#b9b9b7]">
              Type a message… <span className="ml-auto text-[#d0d0ce]">(coming soon)</span>
            </div>
          </div>
        </div>

        {/* Mobile empty hint */}
        <div className="flex items-center justify-center p-10 text-center lg:hidden">
          <div>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <ChatIcon />
            </span>
            <p className="mt-3 text-sm text-[#787774]">Select a conversation to view messages.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({ side, children }: { side: "in" | "out"; children: React.ReactNode }) {
  const out = side === "out";
  return (
    <div className={"flex " + (out ? "justify-end" : "justify-start")}>
      <div
        className={
          "max-w-[75%] rounded-2xl px-4 py-2 text-sm " +
          (out ? "bg-brand text-white" : "border border-[#ededec] bg-white text-[#37352f]")
        }
      >
        {children}
      </div>
    </div>
  );
}
