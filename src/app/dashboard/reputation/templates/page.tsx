import { Button } from "@/components/ui";
import { PageHeader, StatusPill, TemplateIcon, PlusIcon } from "@/components/dashboard/reputation/ui";

// Placeholder sample templates — no business logic yet.
const TEMPLATES = [
  { name: "Post-job review request", channel: "SMS", preview: "Hi {{name}}, thanks for choosing us! Mind leaving a quick review? {{link}}" },
  { name: "Email follow-up", channel: "Email", preview: "We'd love your feedback on the recent work we completed for you…" },
  { name: "Second reminder", channel: "SMS", preview: "Just a friendly reminder — your review means the world to a local business!" },
  { name: "Google review ask", channel: "Email", preview: "It only takes a minute to leave us a Google review — here's the link…" },
];

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates"
        description="Reusable message templates for your review requests."
        action={
          <Button>
            <PlusIcon className="mr-1.5 h-4 w-4" /> New template
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => (
          <div
            key={t.name}
            className="group flex flex-col rounded-xl border border-[#ededec] bg-white p-5 shadow-[0_1px_2px_rgba(15,15,15,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(15,15,15,0.18)]"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <TemplateIcon className="h-5 w-5" />
              </span>
              <StatusPill tone={t.channel === "SMS" ? "blue" : "amber"}>{t.channel}</StatusPill>
            </div>
            <h3 className="mt-4 font-semibold text-[#37352f]">{t.name}</h3>
            <p className="mt-1.5 line-clamp-3 flex-1 text-sm text-[#787774]">{t.preview}</p>
            <div className="mt-4 flex items-center gap-2 border-t border-[#f0f0ef] pt-4">
              <Button variant="secondary" className="text-xs">Edit</Button>
              <Button variant="ghost" className="text-xs">Duplicate</Button>
            </div>
          </div>
        ))}

        {/* New template tile */}
        <button className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-[#e0e0de] bg-[#fafafa] text-[#787774] transition hover:border-brand/40 hover:text-brand">
          <PlusIcon className="h-6 w-6" />
          <span className="mt-2 text-sm font-medium">New template</span>
        </button>
      </div>
    </div>
  );
}
