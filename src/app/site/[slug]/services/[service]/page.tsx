import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site";
import { LeadForm } from "@/components/site/LeadForm";
import { Section, SectionHeading, Button } from "@/components/site/ui";
import { FaqAccordion } from "@/components/site/Faq";
import { PageHero, ProcessSplit, FinancingCards, AreasSplit, CTABand } from "@/components/site/sections";

async function getService(slug: string, serviceSlug: string) {
  const site = await getSiteContent(slug);
  if (!site) return null;
  const service = site.services.find((s) => s.slug === serviceSlug);
  if (!service) return null;
  return { site, service };
}

export async function generateMetadata({ params }: { params: { slug: string; service: string } }): Promise<Metadata> {
  const data = await getService(params.slug, params.service);
  if (!data) return { title: "Not found" };
  const { site, service } = data;
  const loc = site.primaryLocation ? ` in ${site.primaryLocation}` : "";
  return { title: `${service.name}${loc} | ${site.name}`, description: service.description.slice(0, 155) };
}

export default async function ServicePage({ params }: { params: { slug: string; service: string } }) {
  const data = await getService(params.slug, params.service);
  if (!data) notFound();
  const { site, service } = data;
  const loc = site.primaryLocation ? ` in ${site.primaryLocation}` : "";
  const props = site.valueProps.length ? site.valueProps : ["Free, no-obligation estimates", "Licensed, insured & warrantied", "Premium materials, expert install", "Honest, no-pressure pricing"];

  return (
    <>
      <PageHero
        site={site}
        eyebrow="Service"
        title={<>{service.name} <span className="text-client">{site.primaryLocation ?? ""}</span></>}
        subtitle={site.tagline ?? `Professional ${service.name.toLowerCase()}${loc} you can trust.`}
      />

      {/* Large service image beside the quote form */}
      <Section tone="white">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-stretch">
          {service.image_url && (
            <div className="lg:h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={service.image_url} alt={service.name} className="h-64 w-full rounded-2xl object-cover shadow-card sm:h-96 lg:h-full" />
            </div>
          )}
          <aside id="quote" className="scroll-mt-28">
            <div className="rounded-2xl bg-white p-7 shadow-card-hover">
              <LeadForm clientId={site.clientId} services={site.services.map((s) => s.name)} source={`service-${service.slug}`} theme="light" title={`Get a ${service.name} Quote`} subtitle="Free, no-obligation estimate." businessName={site.name} />
            </div>
          </aside>
        </div>

        {/* Description */}
        <div className="mt-14 max-w-3xl">
          <h2 className="font-display text-5xl font-extrabold uppercase text-ink sm:text-6xl">{service.name}{loc}</h2>
          <p className="mt-5 whitespace-pre-wrap text-lg leading-relaxed text-slate-600">{service.description}</p>
          <div className="mt-7"><Button href="#quote">Get a Free Quote</Button></div>
        </div>
      </Section>

      {/* Why choose us (navy) */}
      <Section tone="navy">
        <SectionHeading invert align="left" eyebrow="Why choose us" title={<>Why Choose <span className="text-client">{site.name}</span> For Your {service.name}</>} />
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {props.map((p) => (
            <div key={p} className="flex items-start gap-3 rounded-xl bg-white/5 p-5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-client text-sm font-bold text-white">✓</span>
              <span className="text-[15px] font-medium text-white/90">{p}</span>
            </div>
          ))}
        </div>
        <div className="mt-9"><Button href={`${site.base}/contact`} variant="white">Get a Free Quote</Button></div>
      </Section>

      {/* Process (white) */}
      {site.processSteps.length > 0 && (
        <Section tone="white"><ProcessSplit site={site} /></Section>
      )}

      {/* Financing (white) */}
      {site.financing.length > 0 && (
        <Section tone="light">
          <SectionHeading eyebrow="Financing" title={<>Financing Made <span className="text-client">Simple</span></>} />
          <div className="mt-12"><FinancingCards items={site.financing} /></div>
        </Section>
      )}

      {/* FAQ (white) */}
      {site.faqs.length > 0 && (
        <Section tone="white">
          <SectionHeading eyebrow="Questions" title={<>Frequently Asked <span className="text-client">Questions</span></>} />
          <div className="mt-12"><FaqAccordion faqs={site.faqs} /></div>
        </Section>
      )}

      {/* Areas (light) */}
      {site.areas.length > 0 && (
        <Section tone="light"><AreasSplit site={site} /></Section>
      )}

      <CTABand site={site} />
    </>
  );
}
