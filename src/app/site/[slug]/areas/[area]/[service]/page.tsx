import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site";
import { LeadForm } from "@/components/site/LeadForm";
import { Section, SectionHeading, Button } from "@/components/site/ui";
import { FaqAccordion } from "@/components/site/Faq";
import { PageHero, ProcessSplit, CTABand } from "@/components/site/sections";

// A dedicated "<Service> in <Area>" landing page — the location × service matrix.
// Every area has one of these for every service, for local SEO + navigation.
async function getData(slug: string, areaSlug: string, serviceSlug: string) {
  const site = await getSiteContent(slug);
  if (!site) return null;
  const area = site.areas.find((a) => a.slug === areaSlug);
  const service = site.services.find((s) => s.slug === serviceSlug);
  if (!area || !service) return null;
  return { site, area, service };
}

export async function generateMetadata({ params }: { params: { slug: string; area: string; service: string } }): Promise<Metadata> {
  const data = await getData(params.slug, params.area, params.service);
  if (!data) return { title: "Not found" };
  const { site, area, service } = data;
  return {
    title: `${service.name} in ${area.name} | ${site.name}`,
    description: `Professional ${service.name.toLowerCase()} in ${area.name}. ${site.name} offers free estimates, honest pricing, and quality workmanship.`.slice(0, 155),
  };
}

export default async function AreaServicePage({ params }: { params: { slug: string; area: string; service: string } }) {
  const data = await getData(params.slug, params.area, params.service);
  if (!data) notFound();
  const { site, area, service } = data;
  const base = site.base;

  const otherServices = site.services.filter((s) => s.slug !== service.slug);
  const otherAreas = site.areas.filter((a) => a.slug !== area.slug);
  const props = site.valueProps.length
    ? site.valueProps
    : ["Free, no-obligation estimates", "Licensed, insured & warrantied", "Premium materials, expert install", "Honest, no-pressure pricing"];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: service.name,
    areaServed: area.name,
    provider: { "@type": "LocalBusiness", name: site.name, ...(site.phone ? { telephone: site.phone } : {}) },
    ...(service.description ? { description: service.description } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        site={site}
        eyebrow={`${service.name} · ${area.name}`}
        title={<>{service.name} in <span className="text-client">{area.name}</span></>}
        subtitle={site.tagline ?? `Trusted ${service.name.toLowerCase()} for homeowners and businesses in ${area.name}. Free estimates and quality work.`}
      />

      {/* Image + quote form */}
      <Section tone="white">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-stretch">
          {service.image_url && (
            <div className="lg:h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={service.image_url} alt={`${service.name} in ${area.name}`} className="h-64 w-full rounded-2xl object-cover shadow-card sm:h-96 lg:h-full" />
            </div>
          )}
          <aside id="quote" className="scroll-mt-28">
            <div className="rounded-2xl bg-white p-7 shadow-card-hover">
              <LeadForm
                clientId={site.clientId}
                services={site.services.map((s) => s.name)}
                source={`area-${area.slug}-service-${service.slug}`}
                theme="light"
                title={`Get a ${service.name} Quote in ${area.name}`}
                subtitle="Free, no-obligation estimate."
              />
            </div>
          </aside>
        </div>

        <div className="mt-14 max-w-3xl">
          <h2 className="font-display text-5xl font-extrabold uppercase text-ink sm:text-6xl">{service.name} in {area.name}</h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-600">
            {site.name} provides professional {service.name.toLowerCase()} throughout {area.name}. Our local team delivers
            reliable workmanship and clear communication from your first call to the final walkthrough.
          </p>
          {service.description && <p className="mt-4 whitespace-pre-wrap text-lg leading-relaxed text-slate-600">{service.description}</p>}
          <div className="mt-7"><Button href="#quote">Get a Free Quote</Button></div>
        </div>
      </Section>

      {/* Why choose us */}
      <Section tone="navy">
        <SectionHeading invert align="left" eyebrow="Why choose us" title={<>Why {area.name} Chooses <span className="text-client">{site.name}</span></>} />
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {props.map((p) => (
            <div key={p} className="flex items-start gap-3 rounded-xl bg-white/5 p-5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-client text-sm font-bold text-white">✓</span>
              <span className="text-[15px] font-medium text-white/90">{p}</span>
            </div>
          ))}
        </div>
        <div className="mt-9"><Button href="#quote" variant="white">Get a Free Quote</Button></div>
      </Section>

      {/* Process */}
      {site.processSteps.length > 0 && <Section tone="white"><ProcessSplit site={site} /></Section>}

      {/* Cross-links: other services here + this service in other areas */}
      {(otherServices.length > 0 || otherAreas.length > 0) && (
        <Section tone="light">
          {otherServices.length > 0 && (
            <div>
              <SectionHeading align="left" eyebrow={`More in ${area.name}`} title={<>Other Services in <span className="text-client">{area.name}</span></>} />
              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {otherServices.map((s) => (
                  <Link key={s.slug} href={`${base}/areas/${area.slug}/${s.slug}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-card transition hover:border-client hover:text-client">
                    {s.name} in {area.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {otherAreas.length > 0 && (
            <div className="mt-12">
              <SectionHeading align="left" eyebrow="Other areas" title={<>{service.name} in <span className="text-client">Other Areas</span></>} />
              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {otherAreas.map((a) => (
                  <Link key={a.slug} href={`${base}/areas/${a.slug}/${service.slug}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-card transition hover:border-client hover:text-client">
                    {service.name} in {a.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* FAQ */}
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
