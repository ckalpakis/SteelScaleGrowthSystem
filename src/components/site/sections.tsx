import Link from "next/link";
import { Container, Section, SectionHeading, Button, cn } from "./ui";
import { Reveal } from "./Reveal";
import { Stars } from "./Stars";
import { Marquee } from "./Marquee";
import type { SiteContent, SiteArea } from "@/lib/site";
import type {
  GalleryItem,
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
      <CertStrip badges={site.badges} />
      <Marquee text={site.name} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Certification / trust seals strip.
// ---------------------------------------------------------------------------
export function CertStrip({ badges }: { badges: string[] }) {
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
          <p className="eyebrow">About {site.name}</p>
          <h2 className={cn("mt-3 font-display text-3xl font-extrabold uppercase leading-tight sm:text-4xl", invert ? "text-white" : "text-ink")}>
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
export function WhyChooseSplit({ site }: { site: SiteContent }) {
  const photo = site.gallery[1]?.url ?? site.gallery[0]?.url ?? site.heroImageUrl;
  const props = site.valueProps.length ? site.valueProps : ["Free, same-day estimates", "Local, owner-led crews", "Licensed, insured & warrantied", "Flexible financing options"];
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2">
      <Reveal>
        <div>
          <p className="eyebrow">Why choose us</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold uppercase leading-tight text-ink sm:text-4xl">
            Why More Homeowners Choose <span className="text-client">{site.name}</span>
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {props.map((p) => (
              <div key={p} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-client-tint text-client"><ShieldIcon className="h-5 w-5" /></span>
                <span className="text-[15px] font-medium leading-snug text-slate-700">{p}</span>
              </div>
            ))}
          </div>
          <div className="mt-9"><Button href={`${site.base}/contact`}>Get a Free Quote</Button></div>
        </div>
      </Reveal>
      <Reveal delay={120}>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={site.name} className="aspect-[4/3] w-full rounded-2xl object-cover shadow-card" />
        )}
      </Reveal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reviews split — heading/intro + review cards.
// ---------------------------------------------------------------------------
export function ReviewsSplit({ site }: { site: SiteContent }) {
  if (!site.testimonials.length) return null;
  return (
    <div className="grid gap-10 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <p className="eyebrow">Reviews</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold uppercase leading-tight text-ink sm:text-4xl">
          Real Reviews From Real <span className="text-client">Neighbors</span>
        </h2>
        <p className="mt-4 text-slate-600">Homeowners across {site.primaryLocation ?? "the area"} consistently rate {site.name} 5 stars for our workmanship, communication, and respect for their home.</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:col-span-2">
        {site.testimonials.slice(0, 4).map((t, i) => (
          <Reveal key={i} delay={i * 80}>
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
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={site.name} className="aspect-[4/3] w-full rounded-2xl object-cover shadow-card" />
        )}
      </Reveal>
      <Reveal delay={120}>
        <div>
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold uppercase leading-tight text-ink sm:text-4xl">
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

export function AreasSplit({ site }: { site: SiteContent }) {
  const mapSrc = site.address ? `https://www.google.com/maps?q=${encodeURIComponent(site.address)}&output=embed` : null;
  return (
    <div className="grid items-start gap-12 lg:grid-cols-2">
      <div>
        <p className="eyebrow">Where we work</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold uppercase leading-tight text-ink sm:text-4xl">
          Proudly Serving <span className="text-client">{site.primaryLocation ?? "Your Area"}</span>
        </h2>
        <p className="mt-4 text-slate-600">Local, reliable service for the communities we call home.</p>
        {mapSrc && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 shadow-card">
            <iframe title="Service area map" src={mapSrc} className="h-64 w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        )}
      </div>
      <div>
        <AreasGrid areas={site.areas} base={site.base} />
        <div className="mt-7"><Button href={`${site.base}/areas`} variant="dark">Explore All Service Areas</Button></div>
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
      <p className="eyebrow">Ready to get started?</p>
      <h2 className="mx-auto mt-3 max-w-2xl font-display text-3xl font-extrabold uppercase text-white sm:text-4xl">Let&apos;s Talk About Your Project</h2>
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
