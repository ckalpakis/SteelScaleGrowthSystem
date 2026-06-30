import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site";
import { PageHero, AreasGrid } from "@/components/site/sections";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
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
  const base = `/site/${site.slug}`;

  return (
    <>
      <PageHero
        site={site}
        title="Areas We Serve"
        subtitle="Local, reliable service for the communities we call home."
      />
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="mb-8 text-lg text-gray-600">
          Click your town to learn more about {site.name} in your area.
        </p>
        <div className="flex justify-center">
          <AreasGrid areas={site.areas} base={base} />
        </div>
      </section>
    </>
  );
}
