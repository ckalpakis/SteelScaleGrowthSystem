import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site";
import { Section } from "@/components/site/ui";
import { PageHero, PortfolioMasonry, CTABand } from "@/components/site/sections";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const site = await getSiteContent(params.slug);
  if (!site) return { title: "Not found" };
  return {
    title: `Past Work | ${site.name}`,
    description: `See completed projects from ${site.name}${site.primaryLocation ? ` in ${site.primaryLocation}` : ""}.`,
  };
}

export default async function PastWorkPage({ params }: { params: { slug: string } }) {
  const site = await getSiteContent(params.slug);
  if (!site) notFound();

  return (
    <>
      <PageHero site={site} eyebrow="Our work" title="Past Projects" subtitle="A look at recent work we're proud of." />
      <Section tone="white">
        {site.gallery.length > 0 ? (
          <PortfolioMasonry items={site.gallery} />
        ) : (
          <p className="text-center text-slate-500">Project photos coming soon.</p>
        )}
      </Section>
      <CTABand site={site} />
    </>
  );
}
