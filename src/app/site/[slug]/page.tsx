import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site";
import { LeadForm } from "@/components/site/LeadForm";
import { Reveal } from "@/components/site/Reveal";
import { Section, SectionHeading, Container, Button } from "@/components/site/ui";
import { Stars } from "@/components/site/Stars";
import { Marquee } from "@/components/site/Marquee";
import { FaqAccordion } from "@/components/site/Faq";
import {
  CertStrip,
  StatStrip,
  ServicesShowcase,
  AboutSplit,
  WhyChooseSplit,
  ReviewsSplit,
  ProcessSplit,
  PortfolioMasonry,
  FinancingCards,
  AreasSplit,
  CTABand,
} from "@/components/site/sections";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const site = await getSiteContent(params.slug);
  if (!site) return { title: "Not found" };
  const loc = site.primaryLocation ? ` | ${site.primaryLocation}` : "";
  return {
    title: `${site.name}${loc}`,
    description: site.heroSubheadline ?? site.tagline ?? `${site.name}${site.primaryLocation ? ` serving ${site.primaryLocation}` : ""}. Free estimates and quality work.`,
  };
}

export default async function HomePage({ params }: { params: { slug: string } }) {
  const site = await getSiteContent(params.slug);
  if (!site) notFound();
  const base = site.base;
  const serviceNames = site.services.map((s) => s.name);

  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative isolate overflow-hidden bg-ink">
        {site.heroImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={site.heroImageUrl} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-35" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/95 to-ink/60" />
        <Container className="grid items-center gap-12 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div className="text-white">
            {site.rating != null && (
              <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm backdrop-blur">
                <Stars value={site.rating} className="text-base" />
                <span className="font-semibold text-white">
                  Trusted by {site.reviewCount ? `${site.reviewCount}+ ` : ""}homeowners{site.primaryLocation ? ` in ${site.primaryLocation}` : ""}
                </span>
              </div>
            )}
            <h1 className="mt-5 font-display text-4xl font-extrabold uppercase leading-[1.04] sm:text-5xl lg:text-6xl">
              {renderHeadline(site.heroHeadline, site.primaryLocation)}
            </h1>
            {site.heroSubheadline && <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">{site.heroSubheadline}</p>}

            {site.services.length > 0 && (
              <div className="mt-7 flex flex-wrap gap-3">
                {site.services.slice(0, 3).map((s) => (
                  <Link key={s.slug} href={`${base}/services/${s.slug}`} className="rounded-lg bg-white/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white ring-1 ring-white/20 transition hover:bg-client hover:ring-client">
                    {s.name}
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button href="#quote" size="lg">Get a Free Estimate</Button>
              {site.phone && (
                <a href={`tel:${site.phone}`} className="inline-flex items-center justify-center rounded-xl border-2 border-white/25 px-7 py-4 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/10">Call {site.phone}</a>
              )}
            </div>
          </div>

          <div id="quote" className="scroll-mt-28">
            <Reveal>
              <div className="rounded-3xl bg-white p-6 shadow-float sm:p-8">
                <LeadForm clientId={site.clientId} services={serviceNames} source="website-hero" theme="light" title="Get Your Free Quote" subtitle="Takes 2 minutes — we'll be in touch fast." />
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      <CertStrip badges={site.badges} />
      <Marquee text={site.name} />

      {/* Stats (navy) */}
      {site.stats.length > 0 && (
        <Section tone="navy" className="!py-14">
          <StatStrip stats={site.stats} invert />
        </Section>
      )}

      {/* About (white) */}
      {(site.aboutText || site.gallery.length > 0) && (
        <Section tone="white"><AboutSplit site={site} /></Section>
      )}

      {/* Reviews (light) */}
      {site.testimonials.length > 0 && (
        <Section tone="light"><ReviewsSplit site={site} /></Section>
      )}

      {/* Portfolio (white) */}
      {site.gallery.length > 0 && (
        <Section tone="white">
          <SectionHeading eyebrow="Our work" title={<>See The Difference In Every <span className="text-client">Shingle</span></>} />
          <div className="mt-12"><PortfolioMasonry items={site.gallery.slice(0, 6)} /></div>
          <div className="mt-10 text-center"><Button href={`${base}/past-work`} variant="dark">View All Projects</Button></div>
        </Section>
      )}

      {/* Services (navy) */}
      {site.services.length > 0 && (
        <Section tone="navy">
          <SectionHeading invert eyebrow="What we do" title={<><span className="text-client">Full-Service</span> Roofing & Exterior Solutions</>} subtitle="We specialize in protecting what matters most — your home." />
          <div className="mt-12"><ServicesShowcase services={site.services} base={base} /></div>
        </Section>
      )}

      {/* Why choose us (white) */}
      <Section tone="white"><WhyChooseSplit site={site} /></Section>

      {/* Process (light) */}
      {site.processSteps.length > 0 && (
        <Section tone="light"><ProcessSplit site={site} /></Section>
      )}

      {/* Financing (white) */}
      {site.financing.length > 0 && (
        <Section tone="white">
          <SectionHeading eyebrow="Financing" title={<>Affordable Options That Fit Your <span className="text-client">Budget</span></>} />
          <div className="mt-12"><FinancingCards items={site.financing} /></div>
        </Section>
      )}

      {/* Areas (light) */}
      {site.areas.length > 0 && (
        <Section tone="light"><AreasSplit site={site} /></Section>
      )}

      {/* FAQ (white) */}
      {site.faqs.length > 0 && (
        <Section tone="white">
          <SectionHeading eyebrow="Questions" title={<>Frequently Asked <span className="text-client">Questions</span></>} />
          <div className="mt-12"><FaqAccordion faqs={site.faqs} /></div>
        </Section>
      )}

      <CTABand site={site} />
    </>
  );
}

function renderHeadline(headline: string, location: string | null) {
  if (location && headline.includes(location)) {
    const [before, after] = headline.split(location);
    return (<>{before}<span className="text-client">{location}</span>{after}</>);
  }
  return headline;
}
