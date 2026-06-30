import Link from "next/link";
import { Container, Section, SectionHeading, Button, cn } from "./ui";
import { Reveal } from "./Reveal";
import { Stars } from "./Stars";
import type { SiteContent, SiteArea } from "@/lib/site";
import type {
  GalleryItem,
  ServiceDetail,
  Stat,
  ProcessStep,
  Testimonial,
  FinancingOption,
} from "@/lib/types";

// A simple, consistent roof/house glyph used as the default service icon.
function RoofIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M3 11.5 12 4l9 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9h14v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Inner-page hero (services, areas, about, contact). Accounts for fixed nav.
// ---------------------------------------------------------------------------
export function PageHero({
  site,
  eyebrow,
  title,
  subtitle,
}: {
  site: SiteContent;
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-ink text-white">
      {site.heroImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={site.heroImageUrl} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25" />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/95 to-ink/80" />
      <Container className="pb-16 pt-36 md:pb-20 md:pt-44">
        {eyebrow && <p className="eyebrow text-white/70">{eyebrow}</p>}
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold uppercase leading-[1.05] sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-5 max-w-2xl text-lg text-white/75">{subtitle}</p>}
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href={`${site.base}/contact`} size="lg">Get a Free Quote</Button>
          {site.phone && (
            <a
              href={`tel:${site.phone}`}
              className="inline-flex items-center justify-center rounded-xl border-2 border-white/25 px-7 py-4 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
            >
              Call {site.phone}
            </a>
          )}
        </div>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Trust logos / certifications strip.
// ---------------------------------------------------------------------------
export function TrustLogos({ badges }: { badges: string[] }) {
  if (!badges.length) return null;
  return (
    <div className="border-y border-slate-100 bg-white">
      <Container className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 py-8">
        {badges.map((b) => (
          <span key={b} className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-400">
            <span className="text-client">◆</span>
            {b}
          </span>
        ))}
      </Container>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat strip — big numbers, used on light or navy.
// ---------------------------------------------------------------------------
export function StatStrip({ stats, invert = false }: { stats: Stat[]; invert?: boolean }) {
  if (!stats.length) return null;
  return (
    <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
      {stats.map((s, i) => (
        <Reveal key={s.label} delay={i * 80} className="text-center">
          <div className={cn("font-display text-4xl font-extrabold md:text-5xl", invert ? "text-white" : "text-client")}>
            {s.value}
          </div>
          <div className={cn("mt-1 text-sm font-medium uppercase tracking-wide", invert ? "text-white/60" : "text-slate-500")}>
            {s.label}
          </div>
        </Reveal>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Services showcase — premium cards.
// ---------------------------------------------------------------------------
export function ServicesShowcase({ services, base }: { services: ServiceDetail[]; base: string }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((s, i) => (
        <Reveal key={s.slug} delay={i * 70}>
          <Link
            href={`${base}/services/${s.slug}`}
            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card hover-lift"
          >
            {s.image_url ? (
              <div className="relative h-44 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.image_url} alt={s.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
            ) : (
              <div className="flex h-28 items-center bg-client-tint px-7">
                <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-client text-white">
                  <RoofIcon className="h-7 w-7" />
                </span>
              </div>
            )}
            <div className="flex flex-1 flex-col p-7">
              <h3 className="text-xl font-bold text-ink group-hover:text-client">{s.name}</h3>
              <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">{s.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold uppercase tracking-wide text-client">
                Learn more <span className="transition group-hover:translate-x-1">→</span>
              </span>
            </div>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// About split — large photo beside copy + stats.
// ---------------------------------------------------------------------------
export function AboutSplit({ site }: { site: SiteContent }) {
  const photo = site.gallery[0]?.url ?? site.heroImageUrl;
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2">
      <Reveal>
        <div className="relative">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={site.name} className="aspect-[4/3] w-full rounded-2xl object-cover shadow-card" />
          )}
          {site.rating != null && (
            <div className="absolute -bottom-6 -right-4 hidden rounded-2xl bg-white p-5 shadow-card-hover sm:block">
              <div className="flex items-center gap-2">
                <Stars value={site.rating} className="text-lg" />
                <span className="font-display text-2xl font-extrabold text-ink">{site.rating}</span>
              </div>
              {site.reviewCount != null && <p className="mt-1 text-xs text-slate-500">{site.reviewCount}+ verified reviews</p>}
            </div>
          )}
        </div>
      </Reveal>
      <Reveal delay={120}>
        <div>
          <p className="eyebrow">About {site.name}</p>
          <h2 className="mt-3 text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            {site.aboutHeadline ?? "Your neighbors' trusted local experts"}
          </h2>
          {site.aboutText && <p className="mt-5 text-lg leading-relaxed text-slate-600">{site.aboutText}</p>}
          {site.stats.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-6">
              {site.stats.slice(0, 4).map((s) => (
                <div key={s.label}>
                  <div className="font-display text-3xl font-extrabold text-client">{s.value}</div>
                  <div className="text-sm font-medium uppercase tracking-wide text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-8">
            <Button href={`${site.base}/about`} variant="secondary">Our Story</Button>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Process timeline.
// ---------------------------------------------------------------------------
export function ProcessTimeline({ steps }: { steps: ProcessStep[] }) {
  if (!steps.length) return null;
  return (
    <>
      {/* Desktop: horizontal */}
      <ol className="relative hidden gap-6 md:grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0,1fr))` }}>
        <div className="absolute left-[10%] right-[10%] top-8 h-0.5 bg-slate-200" />
        {steps.map((s, i) => (
          <Reveal key={i} delay={i * 90} className="relative text-center">
            <div className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-client font-display text-2xl font-extrabold text-white shadow-card">
              {i + 1}
            </div>
            <h3 className="mt-5 text-lg font-bold text-ink">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.description}</p>
          </Reveal>
        ))}
      </ol>
      {/* Mobile: vertical */}
      <ol className="relative space-y-8 pl-4 md:hidden">
        <div className="absolute bottom-4 left-[31px] top-4 w-0.5 bg-slate-200" />
        {steps.map((s, i) => (
          <li key={i} className="relative flex gap-5">
            <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-client font-display text-xl font-extrabold text-white">
              {i + 1}
            </div>
            <div className="pt-1">
              <h3 className="text-lg font-bold text-ink">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

// ---------------------------------------------------------------------------
// Portfolio masonry.
// ---------------------------------------------------------------------------
export function PortfolioMasonry({ items }: { items: GalleryItem[] }) {
  if (!items.length) return null;
  return (
    <div className="[column-fill:_balance] gap-5 sm:columns-2 lg:columns-3">
      {items.map((item, i) => (
        <figure
          key={`${item.url}-${i}`}
          className="group relative mb-5 break-inside-avoid overflow-hidden rounded-2xl shadow-card"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt={item.caption ?? "Completed project"} className="w-full object-cover transition duration-500 group-hover:scale-105" />
          {item.caption && (
            <figcaption className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-ink/85 to-transparent p-5 text-sm font-medium text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              {item.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Testimonials.
// ---------------------------------------------------------------------------
export function Testimonials({ items }: { items: Testimonial[] }) {
  if (!items.length) return null;
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {items.map((t, i) => (
        <Reveal key={i} delay={i * 90}>
          <figure className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-7 shadow-card">
            <Stars value={t.rating ?? 5} className="text-lg" />
            <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-slate-700">“{t.quote}”</blockquote>
            <figcaption className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-client-tint font-display text-lg font-extrabold text-client">
                {t.name.charAt(0)}
              </span>
              <div>
                <div className="font-semibold text-ink">{t.name}</div>
                {t.location && <div className="text-xs text-slate-500">{t.location}</div>}
              </div>
            </figcaption>
          </figure>
        </Reveal>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Financing cards.
// ---------------------------------------------------------------------------
export function FinancingCards({ items }: { items: FinancingOption[] }) {
  if (!items.length) return null;
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {items.map((f, i) => (
        <Reveal key={i} delay={i * 80}>
          <div className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-card hover-lift">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-client-tint text-2xl font-extrabold text-client">$</span>
            <h3 className="text-lg font-bold text-ink">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.description}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Areas — city grid (+ optional map).
// ---------------------------------------------------------------------------
export function AreasGrid({ areas, base }: { areas: SiteArea[]; base: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {areas.map((a) => (
        <Link
          key={a.slug}
          href={`${base}/areas/${a.slug}`}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-client hover:text-client hover:shadow-card"
        >
          {a.name}
        </Link>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full-width CTA band (above footer / mid-page).
// ---------------------------------------------------------------------------
export function CTABand({ site }: { site: SiteContent }) {
  return (
    <Section tone="navy" className="relative overflow-hidden">
      <div className="relative z-10 flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
        <div>
          <p className="eyebrow text-white/60">Ready when you are</p>
          <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">Let&apos;s talk about your project</h2>
          <p className="mt-2 text-white/70">Free estimates. Honest pricing. Workmanship you can trust.</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {site.phone && (
            <a
              href={`tel:${site.phone}`}
              className="inline-flex items-center justify-center rounded-xl border-2 border-white/25 px-7 py-4 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
            >
              Call {site.phone}
            </a>
          )}
          <Button href={`${site.base}/contact`} variant="white" size="lg">Get a Free Quote</Button>
        </div>
      </div>
    </Section>
  );
}

// Compact social-proof pill for the homepage hero.
export function RatingInline({ site }: { site: SiteContent }) {
  if (site.rating == null) return null;
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur">
      <Stars value={site.rating} className="text-base" />
      <span className="font-bold">{site.rating}</span>
      {site.reviewCount != null && <span className="text-white/75">· {site.reviewCount}+ reviews</span>}
    </div>
  );
}
