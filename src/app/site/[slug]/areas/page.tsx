import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site";
import { Section } from "@/components/site/ui";
import { PageHero, AreasGrid, CTABand } from "@/components/site/sections";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const site = await getSiteContent(params.slug);
  if (!site) return { title: "Not found" };
  return {
    title: `Service Areas | ${site.name}`,
    description: `${site.name} proudly serves ${site.areas.map((a) => a.name).join(", ")}.`,
  };
}

export default async function AreasPage({ params }: { params: { slug: string } }) {
  const site = await getSiteContent(params.slug);
  if (!site) notFound();

  return (
    <>
      <PageHero
        site={site}
        eyebrow="Where we work"
        title="Areas We Serve"
        subtitle="Local, reliable service for the communities we call home."
      />
      <Section tone="white">
        <p className="mx-auto mb-10 max-w-2xl text-center text-lg text-slate-600">
          Click your town to learn more about {site.name} in your area.
        </p>
        <AreasGrid areas={site.areas} base={site.base} />
      </Section>
      <CTABand site={site} />
    </>
  );
}
