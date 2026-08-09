import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site";
import { LeadForm } from "@/components/site/LeadForm";
import { Section } from "@/components/site/ui";
import { PageHero, CTABand } from "@/components/site/sections";

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
    description: `Trusted local service in ${area.name}. ${site.name} offers ${site.services.map((s) => s.name).slice(0, 4).join(", ")} with free estimates.`,
  };
}

export default async function AreaPage({ params }: { params: { slug: string; area: string } }) {
  const data = await getArea(params.slug, params.area);
  if (!data) notFound();
  const { site, area } = data;
  const base = site.base;

  return (
    <>
      <PageHero
        site={site}
        eyebrow="Service area"
        title={`${site.name} in ${area.name}`}
        subtitle={`Your trusted local choice in ${area.name}. Free estimates, honest pricing, and quality work.`}
      />

      <Section tone="white">
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="text-5xl font-extrabold text-ink sm:text-6xl">Serving {area.name} and the surrounding area</h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              {site.name} is proud to serve homeowners and businesses in {area.name}.
              {site.tagline ? ` ${site.tagline}.` : ""} Whether you need a quick repair or a full project, our local
              team delivers reliable workmanship and clear communication from your first call to the final walkthrough.
            </p>

            {site.services.length > 0 && (
              <div className="mt-10">
                <h3 className="mb-4 text-lg font-bold text-ink">Our services in {area.name}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {site.services.map((s) => (
                    <Link
                      key={s.slug}
                      href={`${base}/areas/${area.slug}/${s.slug}`}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-card transition hover:border-client hover:text-client"
                    >
                      {s.name} in {area.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-slate-100 bg-white p-7 shadow-card-hover">
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
        </div>
      </Section>

      <CTABand site={site} />
    </>
  );
}
