"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/components/ui";

type NavItem = { href: string; label: string; icon: React.ReactNode; external?: boolean; exact?: boolean };

// Notion-style left sidebar shell for the dashboard: a workspace badge, grouped
// nav with active states, and an account area pinned to the bottom. Collapses to
// an off-canvas drawer on mobile.
export function Sidebar({
  name,
  email,
  isAdmin,
  hasClient,
  slug,
}: {
  name: string;
  email: string;
  isAdmin: boolean;
  hasClient: boolean;
  slug: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const nav: NavItem[] = [];
  if (hasClient) {
    nav.push({ href: "/dashboard", label: "Overview", icon: <HomeIcon />, exact: true });
    nav.push({ href: "/dashboard/leads", label: "Leads", icon: <InboxIcon /> });
    nav.push({ href: "/dashboard/reputation", label: "Reputation", icon: <StarNavIcon /> });
    nav.push({ href: "/dashboard/settings", label: "Settings", icon: <CogIcon /> });
  }
  if (isAdmin) {
    nav.push({ href: "/dashboard/clients", label: "Clients", icon: <GridIcon /> });
  }

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");

  const inner = (
    <div className="flex h-full flex-col">
      {/* Workspace badge */}
      <div className="px-3 pb-2 pt-3">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand text-xs font-bold text-white">
            {name.charAt(0).toUpperCase()}
          </span>
          <span className="truncate text-sm font-semibold text-[#37352f]">{name}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3">
        {nav.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                active
                  ? "bg-black/[0.06] font-medium text-[#37352f]"
                  : "text-[#5f5e5b] hover:bg-black/[0.04]"
              )}
            >
              <span className={cn("shrink-0", active ? "text-[#37352f]" : "text-[#91918e]")}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {hasClient && slug && (
          <>
            <div className="my-2 border-t border-[#e9e9e7]" />
            <a
              href={`/site/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-[#5f5e5b] transition-colors hover:bg-black/[0.04]"
            >
              <span className="shrink-0 text-[#91918e]"><ExternalIcon /></span>
              View site
              <span className="ml-auto text-[#b9b9b7]">↗</span>
            </a>
          </>
        )}
      </nav>

      {/* Account */}
      <div className="border-t border-[#e9e9e7] p-3">
        <div className="mb-1 truncate px-2 text-xs text-[#91918e]" title={email}>
          {email}
        </div>
        <form action="/auth/signout" method="post">
          <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-[#5f5e5b] transition-colors hover:bg-black/[0.04]">
            <span className="shrink-0 text-[#91918e]"><SignOutIcon /></span>
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[#e9e9e7] bg-white px-4 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-1.5 text-[#5f5e5b] hover:bg-black/[0.05]"
        >
          <MenuIcon />
        </button>
        <span className="flex items-center gap-2 text-sm font-semibold text-[#37352f]">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-brand text-[10px] font-bold text-white">
            {name.charAt(0).toUpperCase()}
          </span>
          {name}
        </span>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-[#e9e9e7] bg-[#f7f7f5] lg:block">
        <div className="sticky top-0 h-screen">{inner}</div>
      </aside>

      {/* Mobile drawer */}
      {open && <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-[#e9e9e7] bg-[#f7f7f5] transition-transform duration-200 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {inner}
      </aside>
    </>
  );
}

// ---------------------------------------------------------------- icons (18px)
const ic = "h-[18px] w-[18px]";
function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={ic} stroke="currentColor" strokeWidth="1.7">
      <path d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function InboxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={ic} stroke="currentColor" strokeWidth="1.7">
      <path d="M4 13h4l1.5 2.5h5L16 13h4M4 13l2.5-7h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function StarNavIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={ic} stroke="currentColor" strokeWidth="1.7">
      <path d="M12 4l2.35 4.76 5.25.77-3.8 3.7.9 5.23L12 16.9l-4.7 2.46.9-5.23-3.8-3.7 5.25-.77L12 4z" strokeLinejoin="round" />
    </svg>
  );
}
function CogIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={ic} stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1L14.5 3h-4l-.4 2.1a7 7 0 0 0-1.7 1l-2.3-1-2 3.4L4 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.1h4l.4-2.1a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z" strokeLinejoin="round" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={ic} stroke="currentColor" strokeWidth="1.7">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={ic} stroke="currentColor" strokeWidth="1.7">
      <path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={ic} stroke="currentColor" strokeWidth="1.7">
      <path d="M15 12H4m0 0 3.5-3.5M4 12l3.5 3.5M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}
