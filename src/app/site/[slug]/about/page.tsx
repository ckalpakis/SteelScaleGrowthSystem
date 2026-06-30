import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site";
import { PageHero, BadgesRow } from "@/components/site/sections";
import { Stars } from "@/components/site/Stars";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const site = await getSiteContent(params.slug);
  if (!site) return { title: "Not found" };
  return {
    title: `About | ${site.name}`,
    description:
      site.aboutText?.slice(0, 155) ??
      `Learn more about ${site.name}${site.primaryLocation ? ` in ${site.primaryLocation}` : ""}.`,
  };
}

export default async function AboutPage({ params }: { params: { slug: string } }) {
  const site = await getSiteContent(params.slug);
  if (!site) notFound();

  return (
    <>
      <PageHero site={site} title={`About ${site.name}`} subtitle={site.tagline ?? undefined} />

      <section className="mx-auto max-w-3xl px-4 py-16">
        {site.aboutHeadline && (
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">{site.aboutHeadline}</h2>
        )}
        {site.aboutText && (
          <p className="mt-5 whitespace-pre-wrap text-lg leading-relaxed text-gray-700">
            {site.aboutText}
          </p>
        )}

        {site.rating != null && (
          <div className="mt-8 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-5">
            <Stars value={site.rating} className="text-2xl" />
            <div>
              <p className="font-bold text-gray-900">{site.rating} out of 5</p>
              {site.reviewCount != null && (
                <p className="text-sm text-gray-500">Based on {site.reviewCount}+ reviews</p>
              )}
            </div>
          </div>
        )}

        {site.badges.length > 0 && (
          <div className="mt-10">
            <BadgesRow badges={site.badges} />
          </div>
        )}
      </section>
    </>
  );
}
