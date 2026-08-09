import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site";
import { Section, SectionHeading } from "@/components/site/ui";
import { PageHero, StatStrip, Testimonials, CTABand } from "@/components/site/sections";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const site = await getSiteContent(params.slug);
  if (!site) return { title: "Not found" };
  return {
    title: `About | ${site.name}`,
    description: site.aboutText?.slice(0, 155) ?? `Learn more about ${site.name}${site.primaryLocation ? ` in ${site.primaryLocation}` : ""}.`,
  };
}

export default async function AboutPage({ params }: { params: { slug: string } }) {
  const site = await getSiteContent(params.slug);
  if (!site) notFound();
  const photo = site.gallery[0]?.url ?? site.heroImageUrl;

  return (
    <>
      <PageHero site={site} eyebrow={`About ${site.name}`} title={site.aboutHeadline ?? `About ${site.name}`} subtitle={site.tagline ?? undefined} />

      <Section tone="white">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            {site.aboutText && <p className="whitespace-pre-wrap text-lg leading-relaxed text-slate-600">{site.aboutText}</p>}
          </div>
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={site.name} className="aspect-[4/3] w-full rounded-2xl object-cover shadow-card" />
          )}
        </div>
      </Section>

      {site.stats.length > 0 && (
        <Section tone="navy" className="!py-16">
          <StatStrip stats={site.stats} invert />
        </Section>
      )}

      {site.testimonials.length > 0 && (
        <Section tone="light">
          <SectionHeading eyebrow="Reviews" title="What Our Customers Say" />
          <div className="mt-12">
            <Testimonials items={site.testimonials} />
          </div>
        </Section>
      )}

      <CTABand site={site} />
    </>
  );
}
