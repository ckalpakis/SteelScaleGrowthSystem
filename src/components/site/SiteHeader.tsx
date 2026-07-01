"use client";

import { useState } from "react";
import Link from "next/link";
import { Container } from "./ui";
import type { SiteContent } from "@/lib/site";

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.3.2 2.5.57 3.6a1 1 0 0 1-.25 1l-2.2 2.2z" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Solid sticky header: thin dark utility bar + white nav with a brand CTA and
// Services/Areas dropdowns (BlueBuilt pattern).
export function SiteHeader({ site }: { site: SiteContent }) {
  const [open, setOpen] = useState(false);
  const base = site.base;
  const home = base || "/";

  return (
    <header className="sticky top-0 z-50">
      {/* Utility bar — centered, brand-color, taller */}
      <div className="bg-client text-white">
        <Container className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 py-3 text-sm font-medium">
          <span className="hidden font-semibold sm:inline">Need roofing help? Call us now!</span>
          {site.phone && (
            <a href={`tel:${site.phone}`} className="inline-flex items-center gap-2 font-semibold hover:text-white/85">
              <PhoneIcon className="h-4 w-4" />
              {site.phone}
            </a>
          )}
          {site.email && (
            <a href={`mailto:${site.email}`} className="hidden items-center gap-2 hover:text-white/85 sm:inline-flex">
              <MailIcon className="h-4 w-4" />
              {site.email}
            </a>
          )}
        </Container>
      </div>

      {/* Primary nav */}
      <div className="border-b border-slate-100 bg-white shadow-card">
        <Container className="flex items-center justify-between py-3">
          <Link href={home} className="flex items-center gap-2">
            {site.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={site.logoUrl} alt={site.name} className="h-11 w-auto" />
            ) : (
              <span className="font-display text-xl font-extrabold uppercase tracking-tight text-ink">{site.name}</span>
            )}
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            <NavLink href={home}>Home</NavLink>
            <Dropdown label="Services" href={`${base}/services`}>
              <DropItem href={`${base}/services`}>All Services</DropItem>
              {site.services.map((s) => (
                <DropItem key={s.slug} href={`${base}/services/${s.slug}`}>{s.name}</DropItem>
              ))}
            </Dropdown>
            {site.areas.length > 0 && (
              <Dropdown label="Areas" href={`${base}/areas`}>
                <DropItem href={`${base}/areas`}>All Areas</DropItem>
                {site.areas.map((a) => (
                  <DropItem key={a.slug} href={`${base}/areas/${a.slug}`}>{a.name}</DropItem>
                ))}
              </Dropdown>
            )}
            <NavLink href={`${base}/past-work`}>Project Portfolio</NavLink>
            <NavLink href={`${base}/about`}>About Us</NavLink>
            <NavLink href={`${base}/contact`}>Contact</NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <Link href={`${base}/contact`} className="hidden rounded-lg bg-client px-5 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-card transition hover:brightness-110 sm:inline-flex">
              Get Your Quote
            </Link>
            <button onClick={() => setOpen((v) => !v)} aria-label="Toggle menu" className="rounded-md p-2 text-ink lg:hidden">
              <span className="block h-0.5 w-6 bg-current" />
              <span className="mt-1.5 block h-0.5 w-6 bg-current" />
              <span className="mt-1.5 block h-0.5 w-6 bg-current" />
            </button>
          </div>
        </Container>

        {open && (
          <div className="border-t border-slate-100 bg-white lg:hidden">
            <Container className="flex flex-col gap-1 py-4">
              <MobileLink href={home} onClick={() => setOpen(false)}>Home</MobileLink>
              <MobileLink href={`${base}/services`} onClick={() => setOpen(false)}>Services</MobileLink>
              {site.areas.length > 0 && <MobileLink href={`${base}/areas`} onClick={() => setOpen(false)}>Areas</MobileLink>}
              <MobileLink href={`${base}/past-work`} onClick={() => setOpen(false)}>Project Portfolio</MobileLink>
              <MobileLink href={`${base}/about`} onClick={() => setOpen(false)}>About Us</MobileLink>
              <MobileLink href={`${base}/contact`} onClick={() => setOpen(false)}>Contact</MobileLink>
              <Link href={`${base}/contact`} onClick={() => setOpen(false)} className="mt-2 rounded-lg bg-client px-4 py-3 text-center text-sm font-bold uppercase tracking-wide text-white">Get Your Quote</Link>
            </Container>
          </div>
        )}
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="rounded-lg px-3.5 py-2 text-sm font-semibold text-ink/80 transition hover:text-client">{children}</Link>;
}

function Dropdown({ label, href, children }: { label: string; href: string; children: React.ReactNode }) {
  return (
    <div className="group relative">
      <Link href={href} className="flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-semibold text-ink/80 transition hover:text-client">
        {label}<span className="text-[10px]">▾</span>
      </Link>
      <div className="invisible absolute left-0 top-full z-10 min-w-[15rem] translate-y-1 rounded-2xl border border-slate-100 bg-white p-2 opacity-0 shadow-card-hover transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        {children}
      </div>
    </div>
  );
}

function DropItem({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="block rounded-lg px-3 py-2 text-sm font-medium text-ink/80 hover:bg-slate-50 hover:text-client">{children}</Link>;
}

function MobileLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return <Link href={href} onClick={onClick} className="rounded-lg px-2 py-2.5 font-semibold text-ink/80 hover:bg-slate-50">{children}</Link>;
}
