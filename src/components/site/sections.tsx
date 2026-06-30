import Link from "next/link";
import { Stars } from "./Stars";
import type { SiteContent, SiteArea } from "@/lib/site";
import type { GalleryItem, ServiceDetail } from "@/lib/types";

// Compact dark hero for inner pages (services, areas, about, etc.).
export function PageHero({
  site,
  title,
  subtitle,
}: {
  site: SiteContent;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-gray-900 text-white">
      {site.heroImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={site.heroImageUrl} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-20" />
      )}
      <div className="absolute inset-0 -z-10 bg-gray-900/70" />
      <div className="mx-auto max-w-6xl px-4 py-14">
        <h1 className="text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-lg text-gray-300">{subtitle}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`${site.base}/contact`}
            className="bg-client rounded-lg px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:opacity-90"
          >
            Get a Free Quote
          </Link>
          {site.phone && (
            <a
              href={`tel:${site.phone}`}
              className="rounded-lg border border-white/30 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10"
            >
              Call {site.phone}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  center = true,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && (
        <p className="mb-2 text-sm font-bold uppercase tracking-widest text-client">{eyebrow}</p>
      )}
      <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">{title}</h2>
      {subtitle && <p className="mt-3 text-lg text-gray-600">{subtitle}</p>}
    </div>
  );
}

// Dark value-prop bar shown directly under the hero.
export function TrustStrip({ valueProps }: { valueProps: string[] }) {
  if (!valueProps.length) return null;
  return (
    <div className="bg-gray-900 text-white">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4 text-sm font-medium sm:grid-cols-3">
        {valueProps.slice(0, 3).map((vp) => (
          <div key={vp} className="flex items-center justify-center gap-2 text-center">
            <span className="text-lg text-emerald-400">✓</span>
            <span>{vp}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BadgesRow({ badges }: { badges: string[] }) {
  if (!badges.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      {badges.map((b) => (
        <span
          key={b}
          className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500"
        >
          <span className="text-client">●</span>
          {b}
        </span>
      ))}
    </div>
  );
}

export function ServicesGrid({
  services,
  base,
}: {
  services: ServiceDetail[];
  base: string;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((s) => (
        <Link
          key={s.slug}
          href={`${base}/services/${s.slug}`}
          className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
        >
          {s.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.image_url} alt={s.name} className="h-40 w-full object-cover" />
          ) : (
            <div className="bg-client h-2 w-full" />
          )}
          <div className="flex flex-1 flex-col p-5">
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-client">{s.name}</h3>
            <p className="mt-2 line-clamp-3 flex-1 text-sm text-gray-600">{s.description}</p>
            <span className="mt-3 text-sm font-semibold text-client">Learn more →</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function AreasGrid({ areas, base }: { areas: SiteArea[]; base: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      {areas.map((a) => (
        <Link
          key={a.slug}
          href={`${base}/areas/${a.slug}`}
          className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-client hover:text-client"
        >
          {a.name}
        </Link>
      ))}
    </div>
  );
}

export function Gallery({ items }: { items: GalleryItem[] }) {
  if (!items.length) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, i) => (
        <figure key={`${item.url}-${i}`} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt={item.caption ?? "Completed project"} className="h-56 w-full object-cover" />
          {item.caption && (
            <figcaption className="px-4 py-3 text-sm text-gray-600">{item.caption}</figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

// Compact social-proof row (rating + count) for use inside heros.
export function RatingInline({ site }: { site: SiteContent }) {
  if (site.rating == null) return null;
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white backdrop-blur">
      <Stars value={site.rating} className="text-base" />
      <span className="font-bold">{site.rating}</span>
      {site.reviewCount != null && <span className="text-white/80">· {site.reviewCount}+ Reviews</span>}
    </div>
  );
}
