import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site";
import { LeadForm } from "@/components/site/LeadForm";
import { Section } from "@/components/site/ui";
import { PageHero } from "@/components/site/sections";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const site = await getSiteContent(params.slug);
  if (!site) return { title: "Not found" };
  return {
    title: `Contact | ${site.name}`,
    description: `Contact ${site.name}${site.primaryLocation ? ` in ${site.primaryLocation}` : ""} for a free estimate.`,
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
      <PageHero site={site} eyebrow="Get in touch" title="Contact Us" subtitle="Get your free estimate — we'll get right back to you." />

      <Section tone="white">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-extrabold text-ink">Get in touch</h2>
            <dl className="mt-6 space-y-4">
              {site.phone && (
                <Row label="Phone"><a href={`tel:${site.phone}`} className="text-client hover:underline">{site.phone}</a></Row>
              )}
              {site.email && (
                <Row label="Email"><a href={`mailto:${site.email}`} className="text-client hover:underline">{site.email}</a></Row>
              )}
              {site.address && <Row label="Address">{site.address}</Row>}
              {site.hours && <Row label="Hours">{site.hours}</Row>}
              {site.areas.length > 0 && <Row label="Areas served">{site.areas.map((a) => a.name).join(", ")}</Row>}
            </dl>

            {mapSrc && (
              <div className="mt-8 overflow-hidden rounded-2xl border border-slate-100 shadow-card">
                <iframe title="Map" src={mapSrc} className="h-72 w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-7 shadow-card-hover">
            <LeadForm
              clientId={site.clientId}
              services={site.services.map((s) => s.name)}
              source="contact-page"
              theme="light"
              title="Request a Free Estimate"
              businessName={site.name}
            />
          </div>
        </div>
      </Section>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <dt className="w-28 shrink-0 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-700">{children}</dd>
    </div>
  );
}
