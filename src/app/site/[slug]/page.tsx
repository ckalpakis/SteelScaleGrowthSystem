import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ContactForm } from "@/components/site/ContactForm";
import type { Client, ClientSettings } from "@/lib/types";
import { businessName } from "@/lib/types";

// Public, branded website template for a single client (tenant), keyed by slug.
// Reads are allowed by RLS, so the cookie-bound server client is fine here.

async function getSite(
  slug: string
): Promise<{ client: Client; settings: ClientSettings | null } | null> {
  const supabase = createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("slug", slug)
    .single<Client>();
  if (!client) return null;

  const { data: settings } = await supabase
    .from("client_settings")
    .select("*")
    .eq("client_id", client.id)
    .maybeSingle<ClientSettings>();

  return { client, settings };
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const site = await getSite(params.slug);
  if (!site) return { title: "Not found" };
  const name = businessName(site.client, site.settings);
  return {
    title: name,
    description: site.settings?.hero_subheadline ?? `${name} — ${site.settings?.service_area ?? ""}`,
  };
}

export default async function SitePage({ params }: { params: { slug: string } }) {
  const site = await getSite(params.slug);
  if (!site) notFound();

  const { client, settings } = site;
  const name = businessName(client, settings);
  const brand = settings?.brand_color ?? "#1e3a8a";
  const services = settings?.services ?? [];

  return (
    <div style={{ ["--brand" as string]: brand }} className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {settings?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logo_url} alt={name} className="h-9 w-auto" />
            ) : (
              <span className="text-lg font-bold text-client">{name}</span>
            )}
          </div>
          {settings?.phone && (
            <a href={`tel:${settings.phone}`} className="text-sm font-semibold text-client">
              {settings.phone}
            </a>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="bg-client text-white">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {settings?.hero_headline ?? name}
          </h1>
          {settings?.hero_subheadline && (
            <p className="mx-auto mt-5 max-w-2xl text-lg text-white/90">
              {settings.hero_subheadline}
            </p>
          )}
          {settings?.service_area && (
            <p className="mt-3 text-sm font-medium text-white/80">
              Proudly serving {settings.service_area}
            </p>
          )}
          <a
            href="#contact"
            className="mt-8 inline-flex rounded-lg bg-white px-6 py-3 text-sm font-semibold text-client shadow-sm transition hover:bg-gray-100"
          >
            Get a Free Estimate
          </a>
        </div>
      </section>

      {/* Services */}
      {services.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-center text-2xl font-bold text-gray-900">Our Services</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <div
                key={service}
                className="rounded-xl border border-gray-200 p-5 text-center shadow-sm"
              >
                <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-client opacity-90" />
                <p className="font-semibold text-gray-900">{service}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contact / quote form */}
      <section id="contact" className="bg-gray-50">
        <div className="mx-auto max-w-2xl px-6 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Request Your Free Estimate</h2>
            <p className="mt-2 text-gray-600">
              Tell us what you need and we&apos;ll get right back to you.
            </p>
          </div>
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <ContactForm clientId={client.id} services={services} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100">
        <div className="mx-auto max-w-5xl px-6 py-8 text-center text-sm text-gray-500">
          <p className="font-semibold text-gray-700">{name}</p>
          <p className="mt-1">
            {[settings?.phone, settings?.email, settings?.service_area].filter(Boolean).join(" · ")}
          </p>
        </div>
      </footer>
    </div>
  );
}
