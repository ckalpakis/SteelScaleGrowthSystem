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
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13.5 21v-8H16l.5-3h-3V8.2c0-.86.28-1.45 1.5-1.45H17V4.1C16.66 4.05 15.8 4 14.86 4 12.7 4 11 5.3 11 7.9V10H8.5v3H11v8h2.5z" />
    </svg>
  );
}

// Header: brand-color utility bar + white nav, with the logo centered in a
// white badge that bridges both bars; nav links split left / right.
export function SiteHeader({ site }: { site: SiteContent }) {
  const [open, setOpen] = useState(false);
  const base = site.base;
  const home = base || "/";
  const callHref = site.phone ? `tel:${site.phone}` : `${base}/contact`;

  return (
    <header className="sticky top-0 z-50">
      {/* Utility bar (desktop; on mobile the phone lives in the nav row) */}
      <div className="hidden bg-client text-white lg:block">
        <Container className="flex items-center justify-between gap-4 py-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-semibold">
            {site.phone ? (
              <a href={callHref} className="inline-flex items-center gap-2 hover:text-white/85">
                <PhoneIcon className="h-4 w-4" />
                <span className="hidden md:inline">Need roofing help? Call us now!</span>
                <span>{site.phone}</span>
              </a>
            ) : (
              <span>Trusted local roofing &amp; exteriors</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {site.email && (
              <a href={`mailto:${site.email}`} className="hidden items-center gap-2 hover:text-white/85 sm:inline-flex">
                <MailIcon className="h-4 w-4" />
                {site.email}
              </a>
            )}
            {site.facebookUrl && (
              <a href={site.facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook" className="hover:text-white/85">
                <FacebookIcon className="h-4 w-4" />
              </a>
            )}
          </div>
        </Container>
      </div>

      {/* Nav */}
      <div className="border-b border-slate-100 bg-white shadow-card">
        <Container className="flex items-center py-3">
          {/* Left links (desktop) */}
          <nav className="hidden flex-1 items-center gap-1 lg:flex">
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
            <NavLink href={`${base}/past-work`}>Past Work</NavLink>
          </nav>

          {/* Reserved center space for the logo (desktop) */}
          <div className="hidden shrink-0 lg:block lg:w-56 xl:w-64" aria-hidden />

          {/* Right links + CTA (desktop) */}
          <nav className="hidden flex-1 items-center justify-end gap-1 lg:flex">
            <NavLink href={`${base}/about`}>About</NavLink>
            <NavLink href={`${base}/contact`}>Contact</NavLink>
            <Link href={callHref} className="ml-2 rounded-lg bg-client px-6 py-3 text-base font-bold uppercase tracking-wide text-white shadow-card transition hover:brightness-110 xl:text-lg">
              Call Us Now
            </Link>
          </nav>

          {/* Mobile: call button (left) — logo (centered/absolute) — hamburger (right) */}
          <a href={callHref} className="inline-flex items-center gap-1.5 rounded-lg bg-client px-3 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-card lg:hidden">
            <PhoneIcon className="h-4 w-4" />
            Call
          </a>
          <div className="flex-1 lg:hidden" aria-hidden />
          <button onClick={() => setOpen((v) => !v)} aria-label="Toggle menu" className="rounded-md p-2 text-ink lg:hidden">
            <span className="block h-0.5 w-6 bg-current" />
            <span className="mt-1.5 block h-0.5 w-6 bg-current" />
            <span className="mt-1.5 block h-0.5 w-6 bg-current" />
          </button>
        </Container>

        {open && (
          <div className="border-t border-slate-100 bg-white lg:hidden">
            <Container className="flex flex-col gap-1 py-4">
              <MobileLink href={home} onClick={() => setOpen(false)}>Home</MobileLink>
              <MobileLink href={`${base}/services`} onClick={() => setOpen(false)}>Services</MobileLink>
              {site.areas.length > 0 && <MobileLink href={`${base}/areas`} onClick={() => setOpen(false)}>Areas</MobileLink>}
              <MobileLink href={`${base}/past-work`} onClick={() => setOpen(false)}>Past Work</MobileLink>
              <MobileLink href={`${base}/about`} onClick={() => setOpen(false)}>About</MobileLink>
              <MobileLink href={`${base}/contact`} onClick={() => setOpen(false)}>Contact</MobileLink>
              <Link href={callHref} onClick={() => setOpen(false)} className="mt-2 rounded-lg bg-client px-4 py-3 text-center text-sm font-bold uppercase tracking-wide text-white">
                Call Us Now
              </Link>
            </Container>
          </div>
        )}
      </div>

      {/* Centered logo badge — flared banner shape (angled sides), hangs over nav */}
      <Link href={home} className="absolute left-1/2 top-0 z-20 -translate-x-1/2">
        <div
          className="bg-white px-6 pb-3 pt-1.5 sm:px-12 sm:pb-7 sm:pt-2"
          style={{
            clipPath: "polygon(0 0, 100% 0, 88% 100%, 12% 100%)",
            filter: "drop-shadow(0 12px 16px rgba(16,24,40,0.18))",
          }}
        >
          {site.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.logoUrl} alt={site.name} className="h-9 w-auto object-contain sm:h-24 lg:h-28" />
          ) : (
            <span className="font-display text-lg font-extrabold uppercase tracking-tight text-ink sm:text-3xl">{site.name}</span>
          )}
        </div>
      </Link>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="rounded-lg px-3.5 py-2 text-lg font-semibold text-ink/80 transition hover:text-client xl:text-xl">{children}</Link>;
}

function Dropdown({ label, href, children }: { label: string; href: string; children: React.ReactNode }) {
  return (
    <div className="group relative">
      <Link href={href} className="flex items-center gap-1 rounded-lg px-3.5 py-2 text-lg font-semibold text-ink/80 transition hover:text-client xl:text-xl">
        {label}<span className="text-xs">▾</span>
      </Link>
      <div className="invisible absolute left-0 top-full z-30 min-w-[15rem] translate-y-1 rounded-2xl border border-slate-100 bg-white p-2 opacity-0 shadow-card-hover transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        {children}
      </div>
    </div>
  );
}

function DropItem({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="block rounded-lg px-3 py-2 text-sm font-medium text-ink/80 hover:bg-slate-50 hover:text-client">{children}</Link>;
}

function MobileLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return <Link href={href} onClick={onClick} className="rounded-lg px-2 py-3 text-lg font-semibold text-ink/80 hover:bg-slate-50">{children}</Link>;
}
