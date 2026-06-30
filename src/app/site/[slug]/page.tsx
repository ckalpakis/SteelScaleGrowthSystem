import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site";
import { LeadForm } from "@/components/site/LeadForm";
import { Reveal } from "@/components/site/Reveal";
import { Section, SectionHeading, Container, Button } from "@/components/site/ui";
import { FaqAccordion } from "@/components/site/Faq";
import {
  TrustLogos,
  StatStrip,
  ServicesShowcase,
  AboutSplit,
  ProcessTimeline,
  PortfolioMasonry,
  Testimonials,
  FinancingCards,
  AreasGrid,
  CTABand,
  RatingInline,
} from "@/components/site/sections";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const site = await getSiteContent(params.slug);
  if (!site) return { title: "Not found" };
  const loc = site.primaryLocation ? ` | ${site.primaryLocation}` : "";
  return {
    title: `${site.name}${loc}`,
    description:
      site.heroSubheadline ??
      site.tagline ??
      `${site.name}${site.primaryLocation ? ` serving ${site.primaryLocation}` : ""}. Free estimates and quality work.`,
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
          <img src={site.heroImageUrl} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-ink via-ink/95 to-ink/60" />
        <Container className="grid items-center gap-12 pb-20 pt-36 md:pt-44 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="text-white">
            {site.tagline && (
              <p className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                {site.tagline}
              </p>
            )}
            <h1 className="mt-5 font-display text-4xl font-extrabold uppercase leading-[1.04] sm:text-5xl lg:text-6xl">
              {renderHeadline(site.heroHeadline, site.primaryLocation)}
            </h1>
            {site.heroSubheadline && (
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">{site.heroSubheadline}</p>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button href="#quote" size="lg">Get a Free Estimate</Button>
              {site.phone && (
                <a
                  href={`tel:${site.phone}`}
                  className="inline-flex items-center justify-center rounded-xl border-2 border-white/25 px-7 py-4 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
                >
                  Call {site.phone}
                </a>
              )}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <RatingInline site={site} />
              {site.badges.slice(0, 2).map((b) => (
                <span key={b} className="text-sm font-medium text-white/70">✓ {b}</span>
              ))}
            </div>
          </div>

          {/* Floating estimate form */}
          <div id="quote" className="scroll-mt-28">
            <Reveal>
              <div className="rounded-3xl bg-white p-6 shadow-float sm:p-8">
                <LeadForm
                  clientId={site.clientId}
                  services={serviceNames}
                  source="website-hero"
                  theme="light"
                  title="Get Your Free Quote"
                  subtitle="Takes 2 minutes — we'll be in touch fast."
                />
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      <TrustLogos badges={site.badges} />

      {/* -------------------------------------------------------------- Stats */}
      {site.stats.length > 0 && (
        <Section tone="white" className="!py-14">
          <StatStrip stats={site.stats} />
        </Section>
      )}

      {/* ----------------------------------------------------------- Services */}
      {site.services.length > 0 && (
        <Section tone="white">
          <SectionHeading
            eyebrow="What we do"
            title="Full-Service Roofing & Exteriors"
            subtitle={site.primaryLocation ? `Trusted, professional service across ${site.primaryLocation}.` : undefined}
          />
          <div className="mt-12">
            <ServicesShowcase services={site.services} base={base} />
          </div>
        </Section>
      )}

      {/* -------------------------------------------------------------- About */}
      {(site.aboutText || site.gallery.length > 0) && (
        <Section tone="light">
          <AboutSplit site={site} />
        </Section>
      )}

      {/* ------------------------------------------------------------ Process */}
      {site.processSteps.length > 0 && (
        <Section tone="white">
          <SectionHeading eyebrow="How it works" title="A Simple, Stress-Free Process" />
          <div className="mt-14">
            <ProcessTimeline steps={site.processSteps} />
          </div>
        </Section>
      )}

      {/* ------------------------------------------------------------ Portfolio */}
      {site.gallery.length > 0 && (
        <Section tone="light">
          <SectionHeading eyebrow="Our work" title="See The Difference In Every Detail" />
          <div className="mt-12">
            <PortfolioMasonry items={site.gallery.slice(0, 6)} />
          </div>
          <div className="mt-10 text-center">
            <Button href={`${base}/past-work`} variant="secondary">View All Projects</Button>
          </div>
        </Section>
      )}

      {/* ----------------------------------------------------------- Reviews */}
      {site.testimonials.length > 0 && (
        <Section tone="white">
          <SectionHeading eyebrow="Reviews" title="Real Reviews From Real Neighbors" />
          <div className="mt-12">
            <Testimonials items={site.testimonials} />
          </div>
        </Section>
      )}

      {/* ----------------------------------------------------------- Financing */}
      {site.financing.length > 0 && (
        <Section tone="light">
          <SectionHeading eyebrow="Financing" title="Affordable Options That Fit Your Budget" />
          <div className="mt-12">
            <FinancingCards items={site.financing} />
          </div>
        </Section>
      )}

      {/* -------------------------------------------------------------- Areas */}
      {site.areas.length > 0 && (
        <Section tone="white">
          <SectionHeading
            eyebrow="Where we work"
            title="Proudly Serving Your Area"
            subtitle="Local, reliable service for the communities we call home."
          />
          <div className="mt-10">
            <AreasGrid areas={site.areas} base={base} />
          </div>
        </Section>
      )}

      {/* --------------------------------------------------------------- FAQ */}
      {site.faqs.length > 0 && (
        <Section tone="light">
          <SectionHeading eyebrow="Questions" title="Frequently Asked Questions" />
          <div className="mt-12">
            <FaqAccordion faqs={site.faqs} />
          </div>
        </Section>
      )}

      <CTABand site={site} />
    </>
  );
}

// Colors the location portion of the headline with the brand accent.
function renderHeadline(headline: string, location: string | null) {
  if (location && headline.includes(location)) {
    const [before, after] = headline.split(location);
    return (
      <>
        {before}
        <span className="text-client">{location}</span>
        {after}
      </>
    );
  }
  return headline;
}
