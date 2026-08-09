import Link from "next/link";
import { Container } from "./ui";
import type { SiteContent } from "@/lib/site";

// Large premium footer: brand, contact, services, areas, socials.
export function SiteFooter({ site }: { site: SiteContent }) {
  const base = site.base;
  const year = new Date().getFullYear();
  const socials = [
    { href: site.facebookUrl, label: "Facebook", glyph: "f" },
    { href: site.instagramUrl, label: "Instagram", glyph: "◎" },
    { href: site.googleBusinessUrl, label: "Google", glyph: "G" },
  ].filter((s) => s.href);

  return (
    <footer className="section-dark-texture bg-ink text-slate-300">
      <Container className="grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          {site.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.logoUrl} alt={site.name} className="h-10 w-auto brightness-0 invert" />
          ) : (
            <p className="font-display text-xl font-extrabold uppercase text-white">{site.name}</p>
          )}
          {site.tagline && <p className="mt-4 text-sm leading-relaxed text-slate-400">{site.tagline}</p>}
          {socials.length > 0 && (
            <div className="mt-5 flex gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href!}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-sm font-bold text-white transition hover:bg-client hover:border-client"
                >
                  {s.glyph}
                </a>
              ))}
            </div>
          )}
        </div>

        <FooterCol title="Company">
          <FooterLink href={base || "/"}>Home</FooterLink>
          <FooterLink href={`${base}/about`}>About</FooterLink>
          <FooterLink href={`${base}/past-work`}>Past Work</FooterLink>
          <FooterLink href={`${base}/contact`}>Contact</FooterLink>
        </FooterCol>

        {site.services.length > 0 && (
          <FooterCol title="Services">
            {site.services.slice(0, 6).map((s) => (
              <FooterLink key={s.slug} href={`${base}/services/${s.slug}`}>{s.name}</FooterLink>
            ))}
          </FooterCol>
        )}

        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-white/50">Get in touch</p>
          <ul className="space-y-2 text-sm">
            {site.phone && <li><a href={`tel:${site.phone}`} className="font-semibold text-white hover:text-client">{site.phone}</a></li>}
            {site.email && <li><a href={`mailto:${site.email}`} className="hover:text-white">{site.email}</a></li>}
            {site.address && <li className="text-slate-400">{site.address}</li>}
            {site.hours && <li className="text-slate-400">{site.hours}</li>}
          </ul>
        </div>
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-col items-center justify-between gap-2 py-5 text-xs text-slate-500 sm:flex-row">
          <span>© {year} {site.name}. All rights reserved.</span>
          {site.areas.length > 0 && (
            <span className="text-slate-500">Serving {site.areas.slice(0, 4).map((a) => a.name).join(", ")}</span>
          )}
        </Container>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-white/50">{title}</p>
      <ul className="space-y-2 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-slate-400 transition hover:text-white">{children}</Link>
    </li>
  );
}
