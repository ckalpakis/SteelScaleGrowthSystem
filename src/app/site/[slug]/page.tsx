import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site";
import { LeadForm } from "@/components/site/LeadForm";
import {
  SectionHeading,
  TrustStrip,
  ServicesGrid,
  AreasGrid,
  Gallery,
  BadgesRow,
  RatingInline,
} from "@/components/site/sections";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const site = await getSiteContent(params.slug);
  if (!site) return { title: "Not found" };
  const loc = site.primaryLocation ? ` | ${site.primaryLocation}` : "";
  return {
    title: `${site.name}${loc}`,
    description:
      site.heroSubheadline ??
      site.tagline ??
      `${site.name}${site.primaryLocation ? ` serving ${site.primaryLocation}` : ""}. Free estimates and quality work.`,
  };
}

export default async function HomePage({ params }: { params: { slug: string } }) {
  const site = await getSiteContent(params.slug);
  if (!site) notFound();

  const base = site.base;
  const serviceNames = site.services.map((s) => s.name);

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-gray-900">
        {site.heroImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={site.heroImageUrl}
            alt=""
            className="absolute inset-0 -z-10 h-full w-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-gray-900 via-gray-900/90 to-gray-900/60" />

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          {/* Copy */}
          <div className="text-white">
            {site.tagline && (
              <p className="mb-3 inline-block rounded bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white/90">
                {site.tagline}
              </p>
            )}
            <h1 className="text-4xl font-extrabold uppercase leading-tight tracking-tight sm:text-5xl">
              {renderHeadline(site.heroHeadline, site.primaryLocation)}
            </h1>
            {site.heroSubheadline && (
              <p className="mt-5 max-w-xl text-lg text-gray-200">{site.heroSubheadline}</p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href="#quote"
                className="bg-client rounded-lg px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:opacity-90"
              >
                Get a Free Quote
              </Link>
              {site.phone && (
                <a
                  href={`tel:${site.phone}`}
                  className="rounded-lg border border-white/30 px-6 py-3 text-sm font-bold text-white hover:bg-white/10"
                >
                  Call {site.phone}
                </a>
              )}
            </div>
            <div className="mt-6">
              <RatingInline site={site} />
            </div>
          </div>

          {/* Lead form */}
          <div id="quote" className="scroll-mt-28">
            <div className="rounded-2xl border border-white/10 bg-gray-800/80 p-6 shadow-2xl backdrop-blur">
              <LeadForm
                clientId={site.clientId}
                services={serviceNames}
                source="website-hero"
                theme="dark"
                title="Request a Free Quote"
                subtitle="Take the first step — we'll get right back to you."
              />
            </div>
          </div>
        </div>
      </section>

      <TrustStrip valueProps={site.valueProps} />

      {/* Services */}
      {site.services.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <SectionHeading
            eyebrow="What we do"
            title="Our Services"
            subtitle={
              site.primaryLocation
                ? `Trusted, professional service across ${site.primaryLocation}.`
                : undefined
            }
          />
          <div className="mt-10">
            <ServicesGrid services={site.services} base={base} />
          </div>
        </section>
      )}

      {/* Why choose us / badges */}
      {(site.valueProps.length > 0 || site.badges.length > 0) && (
        <section className="bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <SectionHeading eyebrow="Why choose us" title={`The ${site.name} difference`} />
            {site.valueProps.length > 0 && (
              <div className="mx-auto mt-10 grid max-w-4xl gap-5 sm:grid-cols-3">
                {site.valueProps.map((vp) => (
                  <div key={vp} className="rounded-xl border border-gray-200 bg-white p-5 text-center shadow-sm">
                    <div className="bg-client mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white">
                      ✓
                    </div>
                    <p className="text-sm font-medium text-gray-700">{vp}</p>
                  </div>
                ))}
              </div>
            )}
            {site.badges.length > 0 && (
              <div className="mt-10 flex justify-center">
                <BadgesRow badges={site.badges} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Past work preview */}
      {site.gallery.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <SectionHeading eyebrow="Our work" title="Recent Projects" />
          <div className="mt-10">
            <Gallery items={site.gallery.slice(0, 3)} />
          </div>
          <div className="mt-8 text-center">
            <Link href={`${base}/past-work`} className="font-semibold text-client hover:underline">
              View all of our work →
            </Link>
          </div>
        </section>
      )}

      {/* Areas */}
      {site.areas.length > 0 && (
        <section className="bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <SectionHeading
              eyebrow="Where we work"
              title="Areas We Serve"
              subtitle="Proudly serving homeowners and businesses across the region."
            />
            <div className="mt-8 flex justify-center">
              <AreasGrid areas={site.areas} base={base} />
            </div>
          </div>
        </section>
      )}
    </>
  );
}

// Colors the location portion of the headline with the brand accent.
function renderHeadline(headline: string, location: string | null) {
  if (location && headline.includes(location)) {
    const [before, after] = headline.split(location);
    return (
      <>
        {before}
        <span className="text-client">{location}</span>
        {after}
      </>
    );
  }
  return headline;
}
