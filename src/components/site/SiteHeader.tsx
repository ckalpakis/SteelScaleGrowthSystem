"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Container, cn } from "./ui";
import { Stars } from "./Stars";
import type { SiteContent } from "@/lib/site";

// Sticky nav: transparent over the hero, solid white on scroll. Utility bar
// (call/email/rating) collapses once scrolled for a cleaner, premium feel.
export function SiteHeader({ site }: { site: SiteContent }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const base = site.base;
  const home = base || "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || open;
  const linkColor = solid ? "text-ink/80 hover:text-ink" : "text-white/90 hover:text-white";

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Utility bar */}
      <div
        className={cn(
          "hidden overflow-hidden border-b transition-all duration-300 md:block",
          solid ? "max-h-0 border-transparent opacity-0" : "max-h-12 border-white/15 opacity-100"
        )}
      >
        <Container className="flex items-center justify-between py-2 text-xs text-white/85">
          <div className="flex items-center gap-5">
            {site.phone && (
              <a href={`tel:${site.phone}`} className="font-semibold hover:text-white">
                Need a hand? Call {site.phone}
              </a>
            )}
            {site.email && (
              <a href={`mailto:${site.email}`} className="hover:text-white">
                {site.email}
              </a>
            )}
          </div>
          {site.rating != null && (
            <div className="flex items-center gap-2">
              <Stars value={site.rating} className="text-sm" />
              <span className="font-semibold text-white">{site.rating}</span>
              {site.reviewCount != null && <span className="text-white/70">· {site.reviewCount}+ reviews</span>}
            </div>
          )}
        </Container>
      </div>

      {/* Primary nav */}
      <div className={cn("transition-all duration-300", solid ? "bg-white shadow-card" : "bg-transparent")}>
        <Container className="flex items-center justify-between py-4">
          <Link href={home} className="flex items-center gap-2">
            {site.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={site.logoUrl} alt={site.name} className="h-10 w-auto" />
            ) : (
              <span className={cn("font-display text-xl font-extrabold uppercase tracking-tight", solid ? "text-ink" : "text-white")}>
                {site.name}
              </span>
            )}
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            <NavLink href={home} className={linkColor}>Home</NavLink>
            <Dropdown label="Services" href={`${base}/services`} solid={solid}>
              <DropItem href={`${base}/services`}>All Services</DropItem>
              {site.services.map((s) => (
                <DropItem key={s.slug} href={`${base}/services/${s.slug}`}>{s.name}</DropItem>
              ))}
            </Dropdown>
            {site.areas.length > 0 && (
              <Dropdown label="Areas" href={`${base}/areas`} solid={solid}>
                <DropItem href={`${base}/areas`}>All Areas</DropItem>
                {site.areas.map((a) => (
                  <DropItem key={a.slug} href={`${base}/areas/${a.slug}`}>{a.name}</DropItem>
                ))}
              </Dropdown>
            )}
            <NavLink href={`${base}/past-work`} className={linkColor}>Past Work</NavLink>
            <NavLink href={`${base}/about`} className={linkColor}>About</NavLink>
            <NavLink href={`${base}/contact`} className={linkColor}>Contact</NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={`${base}/contact`}
              className="hidden rounded-xl bg-client px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-card transition hover:brightness-110 sm:inline-flex"
            >
              Get a Free Quote
            </Link>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              className={cn("rounded-md p-2 lg:hidden", solid ? "text-ink" : "text-white")}
            >
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
              <MobileLink href={`${base}/past-work`} onClick={() => setOpen(false)}>Past Work</MobileLink>
              <MobileLink href={`${base}/about`} onClick={() => setOpen(false)}>About</MobileLink>
              <MobileLink href={`${base}/contact`} onClick={() => setOpen(false)}>Contact</MobileLink>
              <Link
                href={`${base}/contact`}
                onClick={() => setOpen(false)}
                className="mt-2 rounded-xl bg-client px-4 py-3 text-center text-sm font-semibold uppercase tracking-wide text-white"
              >
                Get a Free Quote
              </Link>
            </Container>
          </div>
        )}
      </div>
    </header>
  );
}

function NavLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("rounded-lg px-3.5 py-2 text-sm font-semibold transition", className)}>
      {children}
    </Link>
  );
}

function Dropdown({
  label,
  href,
  solid,
  children,
}: {
  label: string;
  href: string;
  solid: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative">
      <Link
        href={href}
        className={cn(
          "flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-semibold transition",
          solid ? "text-ink/80 hover:text-ink" : "text-white/90 hover:text-white"
        )}
      >
        {label}
        <span className="text-[10px]">▾</span>
      </Link>
      <div className="invisible absolute left-0 top-full z-10 min-w-[15rem] translate-y-1 rounded-2xl border border-slate-100 bg-white p-2 opacity-0 shadow-card-hover transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        {children}
      </div>
    </div>
  );
}

function DropItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block rounded-lg px-3 py-2 text-sm font-medium text-ink/80 hover:bg-slate-50 hover:text-client">
      {children}
    </Link>
  );
}

function MobileLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="rounded-lg px-2 py-2.5 font-semibold text-ink/80 hover:bg-slate-50">
      {children}
    </Link>
  );
}
