import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site";
import { LeadForm } from "@/components/site/LeadForm";
import { PageHero } from "@/components/site/sections";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const site = await getSiteContent(params.slug);
  if (!site) return { title: "Not found" };
  return {
    title: `Contact | ${site.name}`,
    description: `Contact ${site.name}${
      site.primaryLocation ? ` in ${site.primaryLocation}` : ""
    } for a free estimate.`,
  };
}

export default async function ContactPage({ params }: { params: { slug: string } }) {
  const site = await getSiteContent(params.slug);
  if (!site) notFound();

  const mapSrc = site.address
    ? `https://www.google.com/maps?q=${encodeURIComponent(site.address)}&output=embed`
    : null;

  return (
    <>
      <PageHero
        site={site}
        title="Contact Us"
        subtitle="Get your free estimate — we'll get right back to you."
      />

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2">
        {/* Info */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Get in touch</h2>
          <dl className="mt-6 space-y-4 text-gray-700">
            {site.phone && (
              <ContactRow label="Phone">
                <a href={`tel:${site.phone}`} className="text-client hover:underline">
                  {site.phone}
                </a>
              </ContactRow>
            )}
            {site.email && (
              <ContactRow label="Email">
                <a href={`mailto:${site.email}`} className="text-client hover:underline">
                  {site.email}
                </a>
              </ContactRow>
            )}
            {site.address && <ContactRow label="Address">{site.address}</ContactRow>}
            {site.hours && <ContactRow label="Hours">{site.hours}</ContactRow>}
            {site.areas.length > 0 && (
              <ContactRow label="Areas served">
                {site.areas.map((a) => a.name).join(", ")}
              </ContactRow>
            )}
          </dl>

          {mapSrc && (
            <div className="mt-8 overflow-hidden rounded-xl border border-gray-200">
              <iframe
                title="Map"
                src={mapSrc}
                className="h-64 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <LeadForm
            clientId={site.clientId}
            services={site.services.map((s) => s.name)}
            source="contact-page"
            theme="light"
            title="Request a Free Estimate"
          />
        </div>
      </section>
    </>
  );
}

function ContactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-sm font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
