"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";

const TABS = [
  { href: "/dashboard/reputation", label: "Overview", exact: true },
  { href: "/dashboard/reputation/contacts", label: "Contacts" },
  { href: "/dashboard/reputation/review-requests", label: "Review Requests" },
  { href: "/dashboard/reputation/templates", label: "Templates" },
  { href: "/dashboard/reputation/automations", label: "Automations" },
  { href: "/dashboard/reputation/inbox", label: "Inbox" },
  { href: "/dashboard/reputation/settings", label: "Settings" },
];

// Horizontal underline tab bar for the Reputation module. Scrolls on mobile.
export function ReputationNav() {
  const pathname = usePathname();
  return (
    <div className="border-b border-[#ededec]">
      <nav className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const active = t.exact
            ? pathname === t.href
            : pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-brand text-[#37352f]"
                  : "border-transparent text-[#787774] hover:border-[#e0e0de] hover:text-[#37352f]"
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
