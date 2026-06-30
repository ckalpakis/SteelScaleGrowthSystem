import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site";
import { PageHero, Gallery } from "@/components/site/sections";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const site = await getSiteContent(params.slug);
  if (!site) return { title: "Not found" };
  return {
    title: `Past Work | ${site.name}`,
    description: `See completed projects from ${site.name}${
      site.primaryLocation ? ` in ${site.primaryLocation}` : ""
    }.`,
  };
}

export default async function PastWorkPage({ params }: { params: { slug: string } }) {
  const site = await getSiteContent(params.slug);
  if (!site) notFound();

  return (
    <>
      <PageHero
        site={site}
        title="Our Past Work"
        subtitle="A look at recent projects we're proud of."
      />
      <section className="mx-auto max-w-6xl px-4 py-16">
        {site.gallery.length > 0 ? (
          <Gallery items={site.gallery} />
        ) : (
          <p className="text-center text-gray-500">Project photos coming soon.</p>
        )}
      </section>
    </>
  );
}
