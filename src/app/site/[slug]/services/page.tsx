import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site";
import { PageHero, ServicesGrid } from "@/components/site/sections";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const site = await getSiteContent(params.slug);
  if (!site) return { title: "Not found" };
  const loc = site.primaryLocation ? ` in ${site.primaryLocation}` : "";
  return {
    title: `Services${loc} | ${site.name}`,
    description: `Explore the professional services offered by ${site.name}${loc}. Free estimates and quality workmanship.`,
  };
}

export default async function ServicesPage({ params }: { params: { slug: string } }) {
  const site = await getSiteContent(params.slug);
  if (!site) notFound();
  const base = `/site/${site.slug}`;

  return (
    <>
      <PageHero
        site={site}
        title="Our Services"
        subtitle={
          site.primaryLocation
            ? `Professional service for homeowners and businesses across ${site.primaryLocation}.`
            : "Professional, reliable service backed by a workmanship guarantee."
        }
      />
      <section className="mx-auto max-w-6xl px-4 py-16">
        <ServicesGrid services={site.services} base={base} />
      </section>
    </>
  );
}
