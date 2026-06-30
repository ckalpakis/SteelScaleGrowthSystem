import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site";
import { LeadForm } from "@/components/site/LeadForm";
import { PageHero } from "@/components/site/sections";

async function getArea(slug: string, areaSlug: string) {
  const site = await getSiteContent(slug);
  if (!site) return null;
  const area = site.areas.find((a) => a.slug === areaSlug);
  if (!area) return null;
  return { site, area };
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string; area: string };
}): Promise<Metadata> {
  const data = await getArea(params.slug, params.area);
  if (!data) return { title: "Not found" };
  const { site, area } = data;
  return {
    title: `${site.name} in ${area.name} | Free Estimates`,
    description: `Looking for trusted local service in ${area.name}? ${site.name} offers ${site.services
      .map((s) => s.name)
      .slice(0, 4)
      .join(", ")} with free estimates.`,
  };
}

export default async function AreaPage({
  params,
}: {
  params: { slug: string; area: string };
}) {
  const data = await getArea(params.slug, params.area);
  if (!data) notFound();
  const { site, area } = data;
  const base = site.base;

  return (
    <>
      <PageHero
        site={site}
        title={`${site.name} in ${area.name}`}
        subtitle={`Your trusted local choice in ${area.name}. Free estimates, honest pricing, and quality work.`}
      />

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold text-gray-900">
            Serving {area.name} and the surrounding area
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-700">
            {site.name} is proud to serve homeowners and businesses in {area.name}.
            {site.tagline ? ` ${site.tagline}.` : ""} Whether you need a quick repair or a
            full project, our local team delivers reliable workmanship and clear communication
            from your first call to the final walkthrough.
          </p>

          {site.services.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-3 font-bold text-gray-900">Our services in {area.name}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {site.services.map((s) => (
                  <Link
                    key={s.slug}
                    href={`${base}/services/${s.slug}`}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm hover:border-client hover:text-client"
                  >
                    {s.name} in {area.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {site.areas.length > 1 && (
            <div className="mt-8">
              <h3 className="mb-3 font-bold text-gray-900">Other areas we serve</h3>
              <div className="flex flex-wrap gap-2">
                {site.areas
                  .filter((a) => a.slug !== area.slug)
                  .map((a) => (
                    <Link
                      key={a.slug}
                      href={`${base}/areas/${a.slug}`}
                      className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:border-client hover:text-client"
                    >
                      {a.name}
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
            <LeadForm
              clientId={site.clientId}
              services={site.services.map((s) => s.name)}
              source={`area-${area.slug}`}
              theme="light"
              title={`Free Quote in ${area.name}`}
              subtitle="Tell us about your project."
            />
          </div>
        </aside>
      </section>
    </>
  );
}
