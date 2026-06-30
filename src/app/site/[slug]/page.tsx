import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ContactForm } from "@/components/site/ContactForm";
import type { Client } from "@/lib/types";

// Public, branded website template for a single client (tenant), keyed by slug.
// Reads are allowed by RLS, so the cookie-bound server client is fine here.

async function getClient(slug: string): Promise<Client | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("slug", slug)
    .single<Client>();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const client = await getClient(params.slug);
  if (!client) return { title: "Not found" };
  return {
    title: client.business_name,
    description: client.hero_subheadline ?? `${client.business_name} — ${client.service_area ?? ""}`,
  };
}

export default async function SitePage({ params }: { params: { slug: string } }) {
  const client = await getClient(params.slug);
  if (!client) notFound();

  const brand = client.brand_color ?? "#1e3a8a";
  const services = client.services ?? [];

  return (
    <div style={{ ["--brand" as string]: brand }} className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {client.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={client.logo_url} alt={client.business_name} className="h-9 w-auto" />
            ) : (
              <span className="text-lg font-bold text-client">{client.business_name}</span>
            )}
          </div>
          {client.phone && (
            <a href={`tel:${client.phone}`} className="text-sm font-semibold text-client">
              {client.phone}
            </a>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="bg-client text-white">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {client.hero_headline ?? client.business_name}
          </h1>
          {client.hero_subheadline && (
            <p className="mx-auto mt-5 max-w-2xl text-lg text-white/90">
              {client.hero_subheadline}
            </p>
          )}
          {client.service_area && (
            <p className="mt-3 text-sm font-medium text-white/80">
              Proudly serving {client.service_area}
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
          <p className="font-semibold text-gray-700">{client.business_name}</p>
          <p className="mt-1">
            {[client.phone, client.email, client.service_area].filter(Boolean).join(" · ")}
          </p>
        </div>
      </footer>
    </div>
  );
}
