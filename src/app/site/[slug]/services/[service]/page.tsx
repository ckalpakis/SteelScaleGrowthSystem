import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site";
import { LeadForm } from "@/components/site/LeadForm";
import { Section, Container } from "@/components/site/ui";
import { PageHero, AreasGrid, CTABand } from "@/components/site/sections";

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
  return { title: `${service.name}${loc} | ${site.name}`, description: service.description.slice(0, 155) };
}

export default async function ServicePage({ params }: { params: { slug: string; service: string } }) {
  const data = await getService(params.slug, params.service);
  if (!data) notFound();
  const { site, service } = data;
  const base = site.base;
  const loc = site.primaryLocation ? ` in ${site.primaryLocation}` : "";

  return (
    <>
      <PageHero site={site} eyebrow="Service" title={`${service.name}${loc}`} subtitle={site.tagline ?? undefined} />

      <Section tone="white">
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {service.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={service.image_url} alt={service.name} className="mb-8 aspect-[16/9] w-full rounded-2xl object-cover shadow-card" />
            )}
            <h2 className="text-3xl font-extrabold text-ink">{service.name}{loc}</h2>
            <p className="mt-5 whitespace-pre-wrap text-lg leading-relaxed text-slate-600">{service.description}</p>

            <div className="mt-10 rounded-2xl bg-client-tint p-8">
              <h3 className="text-lg font-bold text-ink">Why homeowners choose {site.name}</h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {(site.valueProps.length ? site.valueProps : ["Free estimates", "Licensed & insured", "Quality workmanship", "Workmanship warranty"]).map((vp) => (
                  <li key={vp} className="flex items-start gap-2 text-slate-700">
                    <span className="mt-0.5 text-client">✓</span>
                    <span>{vp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {site.areas.length > 0 && (
              <div className="mt-10">
                <h3 className="mb-4 text-lg font-bold text-ink">{service.name} available across these areas</h3>
                <AreasGrid areas={site.areas} base={base} />
              </div>
            )}

            {site.services.length > 1 && (
              <div className="mt-10">
                <h3 className="mb-4 text-lg font-bold text-ink">Other services</h3>
                <div className="flex flex-wrap gap-2">
                  {site.services.filter((s) => s.slug !== service.slug).map((s) => (
                    <Link
                      key={s.slug}
                      href={`${base}/services/${s.slug}`}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-client hover:text-client"
                    >
                      {s.name}
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
                source={`service-${service.slug}`}
                theme="light"
                title={`Get a ${service.name} Quote`}
                subtitle="Free, no-obligation estimate."
              />
            </div>
          </aside>
        </div>
      </Section>

      <CTABand site={site} />
    </>
  );
}
