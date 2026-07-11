import { cn } from "@/components/ui";

// =============================================================================
// Reputation module — shared UI primitives. Matches the dashboard's Notion-like
// palette (#37352f / #787774 / #ededec) with a premium SaaS feel. Server-safe
// (no client hooks) so pages can compose them directly.
// =============================================================================

// Page title + description + optional right-aligned action(s).
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#37352f]">{title}</h1>
        {description && <p className="mt-1 text-sm text-[#787774]">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

// KPI stat tile.
export function StatCard({
  label,
  value,
  icon,
  trend,
  trendUp,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#ededec] bg-white p-5 shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-[#787774]">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">{icon}</span>
      </div>
      <div className="mt-3 text-2xl font-bold text-[#37352f]">{value}</div>
      {trend && (
        <div className={cn("mt-1 text-xs font-medium", trendUp ? "text-green-600" : "text-[#9b9a97]")}>{trend}</div>
      )}
    </div>
  );
}

// Titled surface panel with optional header action.
export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[#ededec] bg-white shadow-[0_1px_2px_rgba(15,15,15,0.04)]",
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-[#f0f0ef] px-5 py-3.5">
          <h2 className="text-sm font-semibold text-[#37352f]">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

// Centered empty / coming-soon state used across list pages.
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#e0e0de] bg-[#fafafa] px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">{icon}</div>
      <h3 className="mt-4 text-base font-semibold text-[#37352f]">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-[#787774]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// Search box + optional trailing controls (visual only for now).
export function Toolbar({ placeholder, children }: { placeholder: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-0 flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9b9a97]">
          <SearchIcon />
        </span>
        <input
          type="text"
          placeholder={placeholder}
          className="w-full rounded-md border border-[#e0e0de] bg-white py-2 pl-9 pr-3 text-sm text-[#37352f] placeholder-[#b9b9b7] transition-colors focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15"
        />
      </div>
      {children}
    </div>
  );
}

// Small colored status pill.
export function StatusPill({ tone, children }: { tone: "green" | "amber" | "blue" | "gray" | "red"; children: React.ReactNode }) {
  const tones = {
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    gray: "bg-gray-100 text-gray-600",
    red: "bg-red-50 text-red-700",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

// Inline 5-star rating (filled up to `value`).
export function Stars({ value = 5, className }: { value?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon key={i} className={cn("h-4 w-4", i < value ? "text-amber-400" : "text-[#e0e0de]")} filled />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------- icons
export function StarIcon({ className = "h-5 w-5", filled = false }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M12 4l2.35 4.76 5.25.77-3.8 3.7.9 5.23L12 16.9l-4.7 2.46.9-5.23-3.8-3.7 5.25-.77L12 4z" strokeLinejoin="round" />
    </svg>
  );
}
export function UsersIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 6.5a3 3 0 0 1 0 5.8M18 20a5 5 0 0 0-3-4.6" strokeLinecap="round" />
    </svg>
  );
}
export function SendIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M21 3 10.5 13.5M21 3l-6.5 18-4-8-8-4L21 3z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
export function TemplateIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 9h16M9 9v11" strokeLinecap="round" />
    </svg>
  );
}
export function BoltIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M13 3 4 14h7l-1 7 9-11h-7l1-7z" strokeLinejoin="round" />
    </svg>
  );
}
export function ChatIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M4 5h16v11H9l-4 3.5V16H4a0 0 0 0 1 0 0V5z" strokeLinejoin="round" />
    </svg>
  );
}
export function GearIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1L14.5 3h-4l-.4 2.1a7 7 0 0 0-1.7 1l-2.3-1-2 3.4L4 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.1h4l.4-2.1a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z" strokeLinejoin="round" />
    </svg>
  );
}
export function ChartIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6" strokeLinecap="round" />
    </svg>
  );
}
export function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3-3" strokeLinecap="round" />
    </svg>
  );
}
export function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
