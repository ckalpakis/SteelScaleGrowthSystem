import Link from "next/link";
import { Container, Section, SectionHeading, Button, cn } from "./ui";
import { Reveal } from "./Reveal";
import { Stars } from "./Stars";
import { Marquee } from "./Marquee";
import { ReviewsCarousel } from "./ReviewsCarousel";
import type { SiteContent, SiteArea } from "@/lib/site";
import type {
  GalleryItem,
  BadgeLogo,
  ServiceDetail,
  Stat,
  ProcessStep,
  Testimonial,
  FinancingOption,
} from "@/lib/types";

function RoofIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M3 11.5 12 4l9 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9h14v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Inner-page hero: full-width photo + overlay + trust badges, then the
// certification strip and the scrolling brand marquee (BlueBuilt pattern).
// ---------------------------------------------------------------------------
export function PageHero({
  site,
  eyebrow,
  title,
  subtitle,
}: {
  site: SiteContent;
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink text-white">
        {site.heroImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={site.heroImageUrl} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/95 to-ink/70" />
        <Container className="pb-14 pt-16 md:pb-16">
          {eyebrow && <p className="eyebrow text-white/70">{eyebrow}</p>}
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold uppercase leading-[1.05] sm:text-5xl">{title}</h1>
          {subtitle && <p className="mt-5 max-w-2xl text-lg text-white/75">{subtitle}</p>}
          {site.badges.length > 0 && (
            <div className="mt-7 flex flex-wrap gap-3">
              {site.badges.slice(0, 3).map((b) => (
                <span key={b} className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/85">
                  <ShieldIcon className="h-4 w-4 text-client" />
                  {b}
                </span>
              ))}
            </div>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href={`${site.base}/contact`} size="lg">Get a Free Quote</Button>
            {site.phone && (
              <a href={`tel:${site.phone}`} className="inline-flex items-center justify-center rounded-xl border-2 border-white/25 px-7 py-4 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/10">
                Call {site.phone}
              </a>
            )}
          </div>
        </Container>
      </section>
      <CertStrip logos={site.badgeLogos} badges={site.badges} />
      <Marquee text={site.name} logoUrl={site.logoUrl} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Certification / trust seals strip.
// ---------------------------------------------------------------------------
export function CertStrip({ logos = [], badges = [] }: { logos?: BadgeLogo[]; badges?: string[] }) {
  // Prefer real logo images when provided.
  if (logos.length) {
    return (
      <div className="border-b border-slate-100 bg-white">
        <Container className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 py-8 sm:justify-between sm:gap-x-8">
          {logos.map((l, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${l.url}-${i}`}
              src={l.url}
              alt={l.label ?? "Certification"}
              className="h-16 w-auto object-contain sm:h-20 lg:h-24"
            />
          ))}
        </Container>
      </div>
    );
  }

  if (!badges.length) return null;
  return (
    <div className="border-b border-slate-100 bg-white">
      <Container className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 py-7">
        {badges.map((b) => (
          <div key={b} className="flex flex-col items-center gap-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-200 text-client">
              <ShieldIcon className="h-6 w-6" />
            </span>
            <span className="max-w-[7rem] text-[11px] font-bold uppercase leading-tight tracking-wide text-slate-500">{b}</span>
          </div>
        ))}
      </Container>
    </div>
  );
}
// Backwards-compatible alias (older pages import TrustLogos).
export const TrustLogos = CertStrip;

// ---------------------------------------------------------------------------
// Stat band — brand-color numbers (sits on the navy band).
// ---------------------------------------------------------------------------
export function StatStrip({ stats, invert = false }: { stats: Stat[]; invert?: boolean }) {
  if (!stats.length) return null;
  return (
    <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
      {stats.map((s, i) => (
        <Reveal key={s.label} delay={i * 80} className="text-center">
          <div className="font-display text-4xl font-extrabold text-client md:text-5xl">{s.value}</div>
          <div className={cn("mt-1 text-sm font-medium uppercase tracking-wide", invert ? "text-white/70" : "text-slate-500")}>{s.label}</div>
        </Reveal>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Services showcase — framed-photo cards with a dark "See <service>" button.
// ---------------------------------------------------------------------------
export function ServicesShowcase({ services, base }: { services: ServiceDetail[]; base: string }) {
  return (
    <div className="flex flex-wrap justify-center gap-7">
      {services.map((s, i) => (
        <Reveal
          key={s.slug}
          delay={i * 70}
          className="w-full sm:w-[calc((100%-1.75rem)/2)] lg:w-[calc((100%-3.5rem)/3)]"
        >
          <Link href={`${base}/services/${s.slug}`} className="group flex h-full flex-col rounded-2xl bg-white p-3 text-center shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-card-hover">
            <div className="overflow-hidden rounded-xl">
              {s.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.image_url} alt={s.name} className="aspect-[16/11] w-full object-cover transition duration-500 group-hover:scale-105" />
              ) : (
                <div className="flex aspect-[16/11] w-full items-center justify-center bg-client-tint">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-client text-white"><RoofIcon className="h-8 w-8" /></span>
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col px-4 pb-5 pt-6">
              <h3 className="font-display text-xl font-extrabold uppercase tracking-tight text-client">{s.name}</h3>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-slate-600">{s.description}</p>
              <span className="mt-6 inline-flex items-center justify-center self-center rounded-lg bg-ink px-5 py-3 text-xs font-bold uppercase tracking-wide text-white transition group-hover:bg-client">See {s.name}</span>
            </div>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// About split — photo + copy + stats (used on home "meet the team").
// ---------------------------------------------------------------------------
export function AboutSplit({ site, invert = false }: { site: SiteContent; invert?: boolean }) {
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
          {site.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={site.logoUrl}
              alt={site.name}
              className={cn("mb-5 h-12 w-auto object-contain", invert && "brightness-0 invert")}
            />
          )}
          <p className="eyebrow">About {site.name}</p>
          <h2 className={cn("mt-3 font-display text-4xl font-extrabold uppercase leading-tight sm:text-5xl", invert ? "text-white" : "text-ink")}>
            {site.aboutHeadline ?? "Meet the team that puts people first"}
          </h2>
          {site.aboutText && <p className={cn("mt-5 text-lg leading-relaxed", invert ? "text-white/75" : "text-slate-600")}>{site.aboutText}</p>}
          {site.stats.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-6">
              {site.stats.slice(0, 4).map((s) => (
                <div key={s.label}>
                  <div className="font-display text-3xl font-extrabold text-client">{s.value}</div>
                  <div className={cn("text-sm font-medium uppercase tracking-wide", invert ? "text-white/60" : "text-slate-500")}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-8"><Button href={`${site.base}/about`} variant={invert ? "white" : "dark"}>Our Story</Button></div>
        </div>
      </Reveal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Why choose us — feature list + photo.
// ---------------------------------------------------------------------------
// Rotating set of feature icons (matches the varied icons in the reference).
const FEATURE_ICONS = [
  (c: string) => (
    <svg viewBox="0 0 24 24" fill="none" className={c} aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  (c: string) => (
    <svg viewBox="0 0 24 24" fill="none" className={c} aria-hidden>
      <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 7a3 3 0 0 1 0 5.5M15 19a5.5 5.5 0 0 0-2-4.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  (c: string) => (
    <svg viewBox="0 0 24 24" fill="none" className={c} aria-hidden>
      <path d="M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="2.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  ),
  (c: string) => (
    <svg viewBox="0 0 24 24" fill="none" className={c} aria-hidden>
      <path d="M3 15c2-1 4-1 6 0M9 12h6a2 2 0 0 1 0 4H10l-4 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="7" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M16 6v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  (c: string) => (
    <svg viewBox="0 0 24 24" fill="none" className={c} aria-hidden>
      <path d="M4 4h7l9 9-7 7-9-9V4z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" />
    </svg>
  ),
  (c: string) => (
    <svg viewBox="0 0 24 24" fill="none" className={c} aria-hidden>
      <path d="m12 4 2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4L7.5 17.7l.9-5L4.8 9.2l5-.7L12 4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
];

const DEFAULT_VALUE_PROPS = [
  "Fast, Same-Day Estimates",
  "Owner-Led, Community-Focused",
  "Local Experts, Never Outsourced",
  "Flexible Financing Options",
  "Licensed, Insured & Warrantied",
  "5-Star Customer Ratings",
];

export function WhyChooseSplit({ site }: { site: SiteContent }) {
  const photo = site.gallery[1]?.url ?? site.gallery[0]?.url ?? site.heroImageUrl;

  // Always show a full set (6+). Pad with defaults if the client set fewer.
  const provided = site.valueProps;
  const props =
    provided.length >= 6
      ? provided
      : [...provided, ...DEFAULT_VALUE_PROPS.filter((d) => !provided.includes(d))].slice(0, 6);

  return (
    <div className="grid items-stretch gap-12 lg:grid-cols-2">
      <Reveal>
        <div>
          <h2 className="font-display text-4xl font-extrabold uppercase leading-[1.1] sm:text-5xl">
            <span className="text-ink">Why More Homeowners</span>
            <br />
            <span className="text-client">Choose {site.name}</span>
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-slate-600">
            Not all roofing companies are created equal. {site.name} goes above and beyond — professional work
            backed by industry-leading standards and the kind of personal service you only get from a local
            business you can trust.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {props.map((p, i) => {
              const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
              return (
                <div key={p} className="flex min-h-[92px] overflow-hidden rounded-2xl shadow-card">
                  <div className="flex w-24 shrink-0 items-center justify-center bg-client-tint text-client">
                    {Icon("h-9 w-9")}
                  </div>
                  <div className="flex flex-1 items-center bg-ink px-5 py-5">
                    <span className="text-base font-bold leading-snug text-white">{p}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>
      <Reveal delay={120}>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={site.name}
            className="h-64 w-full rounded-2xl object-cover shadow-card sm:h-96 lg:h-full"
          />
        )}
      </Reveal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reviews split — heading/intro + review cards.
// ---------------------------------------------------------------------------
export function ReviewsSplit({ site, invert = false }: { site: SiteContent; invert?: boolean }) {
  if (!site.testimonials.length) return null;
  return (
    <div className="grid gap-10 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <p className="eyebrow">Reviews</p>
        <h2 className={cn("mt-3 font-display text-4xl font-extrabold uppercase leading-tight sm:text-5xl", invert ? "text-white" : "text-ink")}>
          Real Reviews From Real <span className="text-client">Neighbors</span>
        </h2>
        <p className={cn("mt-4", invert ? "text-white/70" : "text-slate-600")}>Homeowners across {site.primaryLocation ?? "the area"} consistently rate {site.name} 5 stars for our workmanship, communication, and respect for their home.</p>
      </div>
      <div className="lg:col-span-2">
        <ReviewsCarousel items={site.testimonials} />
      </div>
    </div>
  );
}

// Plain grid of testimonial cards (used on the About page).
export function Testimonials({ items }: { items: Testimonial[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap justify-center gap-6">
      {items.map((t, i) => (
        <Reveal key={i} delay={i * 90} className="w-full md:w-[calc((100%-3rem)/3)]">
          <figure className="flex h-full flex-col rounded-2xl bg-white p-7 shadow-card">
            <Stars value={t.rating ?? 5} className="text-lg" />
            <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-slate-700">“{t.quote}”</blockquote>
            <figcaption className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-client-tint font-display text-lg font-extrabold text-client">{t.name.charAt(0)}</span>
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
// Process split — photo + numbered navy pill rows.
// ---------------------------------------------------------------------------
export function ProcessSplit({ site }: { site: SiteContent }) {
  const steps = site.processSteps;
  if (!steps.length) return null;
  const photo = site.gallery[2]?.url ?? site.heroImageUrl;
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2">
      <Reveal>
        <div className="relative">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={site.name} className="aspect-[4/3] w-full rounded-2xl object-cover shadow-card" />
          )}
          {site.logoUrl && (
            <div className="absolute -bottom-8 -left-6 rounded-2xl bg-white p-4 shadow-card-hover sm:-left-8 sm:p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={site.logoUrl} alt={site.name} className="h-28 w-auto object-contain sm:h-32 lg:h-40" />
            </div>
          )}
        </div>
      </Reveal>
      <Reveal delay={120}>
        <div>
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 font-display text-4xl font-extrabold uppercase leading-tight text-ink sm:text-5xl">
            Our Process: <span className="text-client">Simple, Fast & Stress-Free</span>
          </h2>
          <ol className="mt-7 space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex items-center gap-4 rounded-xl bg-ink px-5 py-4 text-white">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-client font-display text-lg font-extrabold">{i + 1}</span>
                <div>
                  <p className="font-semibold">{s.title}</p>
                  {s.description && <p className="text-sm text-white/60">{s.description}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Portfolio masonry.
// ---------------------------------------------------------------------------
export function PortfolioMasonry({ items }: { items: GalleryItem[] }) {
  if (!items.length) return null;
  return (
    <div className="gap-5 [column-fill:_balance] sm:columns-2 lg:columns-3">
      {items.map((item, i) => (
        <figure key={`${item.url}-${i}`} className="group relative mb-5 break-inside-avoid overflow-hidden rounded-2xl shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt={item.caption ?? "Completed project"} className="w-full object-cover transition duration-500 group-hover:scale-105" />
          {item.caption && (
            <figcaption className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-ink/90 to-transparent p-5 text-sm font-medium text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">{item.caption}</figcaption>
          )}
        </figure>
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
    <div className="flex flex-wrap justify-center gap-6">
      {items.map((f, i) => (
        <Reveal key={i} delay={i * 80} className="w-full md:w-[calc((100%-3rem)/3)]">
          <div className="flex h-full flex-col rounded-2xl bg-white p-8 text-center shadow-card hover-lift">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-client-tint text-2xl font-extrabold text-client">$</span>
            <h3 className="font-display text-lg font-extrabold uppercase text-ink">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.description}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Areas — split (heading + map) / grid.
// ---------------------------------------------------------------------------
export function AreasGrid({ areas, base }: { areas: SiteArea[]; base: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {areas.map((a) => (
        <Link key={a.slug} href={`${base}/areas/${a.slug}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-client hover:text-client hover:shadow-card">
          {a.name}
        </Link>
      ))}
    </div>
  );
}

export function AreasSplit({ site, invert = false }: { site: SiteContent; invert?: boolean }) {
  const mapSrc = site.address ? `https://www.google.com/maps?q=${encodeURIComponent(site.address)}&output=embed` : null;
  return (
    <div className="grid items-start gap-12 lg:grid-cols-2">
      <div>
        <p className="eyebrow">Where we work</p>
        <h2 className={cn("mt-3 font-display text-4xl font-extrabold uppercase leading-tight sm:text-5xl", invert ? "text-white" : "text-ink")}>
          Proudly Serving <span className="text-client">{site.primaryLocation ?? "Your Area"}</span>
        </h2>
        <p className={cn("mt-4", invert ? "text-white/70" : "text-slate-600")}>Local, reliable service for the communities we call home.</p>
        {mapSrc && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 shadow-card">
            <iframe title="Service area map" src={mapSrc} className="h-64 w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        )}
      </div>
      <div>
        <AreasGrid areas={site.areas} base={site.base} />
        <div className="mt-7"><Button href={`${site.base}/areas`} variant={invert ? "white" : "dark"}>Explore All Service Areas</Button></div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CTA band (navy, centered).
// ---------------------------------------------------------------------------
export function CTABand({ site }: { site: SiteContent }) {
  return (
    <Section tone="navy" className="text-center">
      {site.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={site.logoUrl} alt={site.name} className="mx-auto mb-6 h-14 w-auto brightness-0 invert" />
      )}
      <p className="eyebrow">Ready to get started?</p>
      <h2 className="mx-auto mt-3 max-w-3xl font-display text-4xl font-extrabold uppercase text-white sm:text-5xl">Let&apos;s Talk About Your Project</h2>
      <p className="mx-auto mt-3 max-w-xl text-white/70">Free estimates, honest pricing, and workmanship you can trust.</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {site.phone && (
          <a href={`tel:${site.phone}`} className="inline-flex items-center justify-center rounded-xl border-2 border-white/25 px-7 py-4 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/10">Call {site.phone}</a>
        )}
        <Button href={`${site.base}/contact`} variant="white" size="lg">Get a Free Quote</Button>
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
