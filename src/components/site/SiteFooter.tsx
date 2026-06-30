import Link from "next/link";
import type { SiteContent } from "@/lib/site";

// Site-wide footer: contact info, quick links, services, areas, and a final CTA.
export function SiteFooter({ site }: { site: SiteContent }) {
  const base = site.base;
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* CTA band */}
      <div className="bg-client">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-center sm:flex-row sm:text-left">
          <div>
            <h2 className="text-xl font-bold text-white">Ready to get started?</h2>
            <p className="text-white/85">Free estimates. Fast, friendly service.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {site.phone && (
              <a
                href={`tel:${site.phone}`}
                className="rounded-lg bg-white/15 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/25"
              >
                Call {site.phone}
              </a>
            )}
            <Link
              href={`${base}/contact`}
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-client hover:bg-gray-100"
            >
              Get a Free Quote
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-extrabold uppercase text-white">{site.name}</p>
          {site.tagline && <p className="mt-2 text-sm text-gray-400">{site.tagline}</p>}
          <div className="mt-4 space-y-1 text-sm">
            {site.phone && <a href={`tel:${site.phone}`} className="block hover:text-white">{site.phone}</a>}
            {site.email && <a href={`mailto:${site.email}`} className="block hover:text-white">{site.email}</a>}
            {site.address && <p className="text-gray-400">{site.address}</p>}
            {site.hours && <p className="text-gray-400">{site.hours}</p>}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white">Company</p>
          <ul className="space-y-2 text-sm">
            <FooterLink href={base || "/"}>Home</FooterLink>
            <FooterLink href={`${base}/about`}>About</FooterLink>
            <FooterLink href={`${base}/past-work`}>Past Work</FooterLink>
            <FooterLink href={`${base}/contact`}>Contact</FooterLink>
          </ul>
        </div>

        {site.services.length > 0 && (
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white">Services</p>
            <ul className="space-y-2 text-sm">
              {site.services.slice(0, 6).map((s) => (
                <FooterLink key={s.slug} href={`${base}/services/${s.slug}`}>
                  {s.name}
                </FooterLink>
              ))}
            </ul>
          </div>
        )}

        {site.areas.length > 0 && (
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white">Areas We Serve</p>
            <ul className="space-y-2 text-sm">
              {site.areas.slice(0, 6).map((a) => (
                <FooterLink key={a.slug} href={`${base}/areas/${a.slug}`}>
                  {a.name}
                </FooterLink>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-gray-500">
          © {year} {site.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-gray-400 hover:text-white">
        {children}
      </Link>
    </li>
  );
}
