"use client";

import { useState } from "react";
import Link from "next/link";
import { Stars } from "./Stars";
import type { SiteContent } from "@/lib/site";

// Utility bar + sticky primary nav with Services/Areas dropdowns, a brand-color
// "Get a Free Quote" CTA, and a mobile menu. Modeled on high-converting local
// home-services sites.
export function SiteHeader({ site }: { site: SiteContent }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const base = `/site/${site.slug}`;
  const quoteHref = `${base}#quote`;

  return (
    <header className="sticky top-0 z-40">
      {/* Utility bar */}
      <div className="bg-gray-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-1.5 text-xs sm:text-sm">
          <div className="flex items-center gap-4">
            {site.phone && (
              <a href={`tel:${site.phone}`} className="font-semibold hover:text-white/80">
                📞 Call us now: {site.phone}
              </a>
            )}
            {site.email && (
              <a href={`mailto:${site.email}`} className="hidden text-white/80 hover:text-white md:inline">
                ✉ {site.email}
              </a>
            )}
          </div>
          {site.rating != null && site.reviewCount != null && (
            <div className="flex items-center gap-1.5">
              <Stars value={site.rating} className="text-sm" />
              <span className="font-medium">{site.rating}</span>
              <span className="hidden text-white/70 sm:inline">· {site.reviewCount}+ Reviews</span>
            </div>
          )}
        </div>
      </div>

      {/* Primary nav */}
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href={base} className="flex items-center gap-2">
            {site.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={site.logoUrl} alt={site.name} className="h-9 w-auto" />
            ) : (
              <span className="text-lg font-extrabold uppercase tracking-tight text-client">
                {site.name}
              </span>
            )}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            <NavLink href={base}>Home</NavLink>
            <Dropdown label="Services" href={`${base}/services`}>
              <DropItem href={`${base}/services`}>All Services</DropItem>
              {site.services.map((s) => (
                <DropItem key={s.slug} href={`${base}/services/${s.slug}`}>
                  {s.name}
                </DropItem>
              ))}
            </Dropdown>
            {site.areas.length > 0 && (
              <Dropdown label="Areas" href={`${base}/areas`}>
                <DropItem href={`${base}/areas`}>All Areas</DropItem>
                {site.areas.map((a) => (
                  <DropItem key={a.slug} href={`${base}/areas/${a.slug}`}>
                    {a.name}
                  </DropItem>
                ))}
              </Dropdown>
            )}
            <NavLink href={`${base}/past-work`}>Past Work</NavLink>
            <NavLink href={`${base}/about`}>About</NavLink>
            <NavLink href={`${base}/contact`}>Contact</NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={quoteHref}
              className="bg-client hidden rounded-lg px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:opacity-90 sm:inline-flex"
            >
              Get a Free Quote
            </Link>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-md p-2 text-gray-700 hover:bg-gray-100 lg:hidden"
              aria-label="Toggle menu"
            >
              <span className="block h-0.5 w-6 bg-current" />
              <span className="mt-1.5 block h-0.5 w-6 bg-current" />
              <span className="mt-1.5 block h-0.5 w-6 bg-current" />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-gray-100 bg-white px-4 py-3 lg:hidden">
            <nav className="flex flex-col gap-1 text-sm">
              <MobileLink href={base} onClick={() => setMobileOpen(false)}>Home</MobileLink>
              <MobileLink href={`${base}/services`} onClick={() => setMobileOpen(false)}>Services</MobileLink>
              {site.areas.length > 0 && (
                <MobileLink href={`${base}/areas`} onClick={() => setMobileOpen(false)}>Areas</MobileLink>
              )}
              <MobileLink href={`${base}/past-work`} onClick={() => setMobileOpen(false)}>Past Work</MobileLink>
              <MobileLink href={`${base}/about`} onClick={() => setMobileOpen(false)}>About</MobileLink>
              <MobileLink href={`${base}/contact`} onClick={() => setMobileOpen(false)}>Contact</MobileLink>
              <Link
                href={quoteHref}
                onClick={() => setMobileOpen(false)}
                className="bg-client mt-2 rounded-lg px-4 py-2.5 text-center text-sm font-bold uppercase tracking-wide text-white"
              >
                Get a Free Quote
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-sm font-semibold text-gray-700 hover:text-client"
    >
      {children}
    </Link>
  );
}

function Dropdown({
  label,
  href,
  children,
}: {
  label: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative">
      <Link
        href={href}
        className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold text-gray-700 hover:text-client"
      >
        {label}
        <span className="text-xs">▾</span>
      </Link>
      <div className="invisible absolute left-0 top-full z-10 min-w-[14rem] rounded-lg border border-gray-100 bg-white py-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
        {children}
      </div>
    </div>
  );
}

function DropItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-client">
      {children}
    </Link>
  );
}

function MobileLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} onClick={onClick} className="rounded-md px-2 py-2 font-semibold text-gray-700 hover:bg-gray-50">
      {children}
    </Link>
  );
}
