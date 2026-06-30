import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site";
import { LeadForm } from "@/components/site/LeadForm";
import { PageHero, AreasGrid } from "@/components/site/sections";

async function getService(slug: string, serviceSlug: string) {
  const site = await getSiteContent(slug);
  if (!site) return null;
  const service = site.services.find((s) => s.slug === serviceSlug);
  if (!service) return null;
  return { site, service };
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string; service: string };
}): Promise<Metadata> {
  const data = await getService(params.slug, params.service);
  if (!data) return { title: "Not found" };
  const { site, service } = data;
  const loc = site.primaryLocation ? ` in ${site.primaryLocation}` : "";
  return {
    title: `${service.name}${loc} | ${site.name}`,
    description: service.description.slice(0, 155),
  };
}

export default async function ServicePage({
  params,
}: {
  params: { slug: string; service: string };
}) {
  const data = await getService(params.slug, params.service);
  if (!data) notFound();
  const { site, service } = data;
  const base = site.base;
  const loc = site.primaryLocation ? ` in ${site.primaryLocation}` : "";

  return (
    <>
      <PageHero site={site} title={`${service.name}${loc}`} subtitle={site.tagline ?? undefined} />

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {service.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={service.image_url} alt={service.name} className="mb-6 h-64 w-full rounded-xl object-cover" />
          )}
          <h2 className="text-2xl font-bold text-gray-900">
            {service.name}
            {loc}
          </h2>
          <p className="mt-4 whitespace-pre-wrap text-lg leading-relaxed text-gray-700">
            {service.description}
          </p>

          <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-6">
            <h3 className="font-bold text-gray-900">Why homeowners choose {site.name}</h3>
            <ul className="mt-3 space-y-2 text-gray-700">
              {(site.valueProps.length ? site.valueProps : ["Free estimates", "Licensed & insured", "Quality workmanship"]).map(
                (vp) => (
                  <li key={vp} className="flex items-start gap-2">
                    <span className="text-client">✓</span>
                    <span>{vp}</span>
                  </li>
                )
              )}
            </ul>
          </div>

          {site.areas.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-3 font-bold text-gray-900">
                {service.name} available in these areas
              </h3>
              <AreasGrid areas={site.areas} base={base} />
            </div>
          )}

          {site.services.length > 1 && (
            <div className="mt-8">
              <h3 className="mb-3 font-bold text-gray-900">Other services</h3>
              <div className="flex flex-wrap gap-2">
                {site.services
                  .filter((s) => s.slug !== service.slug)
                  .map((s) => (
                    <Link
                      key={s.slug}
                      href={`${base}/services/${s.slug}`}
                      className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:border-client hover:text-client"
                    >
                      {s.name}
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky quote form */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
            <LeadForm
              clientId={site.clientId}
              services={site.services.map((s) => s.name)}
              source={`service-${service.slug}`}
              theme="light"
              title={`Get a ${service.name} Quote`}
              subtitle="Free, no-obligation estimate."
            />
          </div>
        </aside>
      </section>
    </>
  );
}
