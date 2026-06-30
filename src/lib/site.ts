import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { businessName } from "@/lib/types";
import type { Client, ClientSettings, ServiceDetail, GalleryItem } from "@/lib/types";
import { hostnameFrom, classifyHost } from "@/lib/tenant";

// =============================================================================
// Data access + content normalization for the public website template.
// Everything the site renders comes from one normalized, serializable object
// (`SiteContent`) so pages and client components stay clean.
// =============================================================================

export interface SiteArea {
  slug: string;
  name: string;
}

export interface SiteContent {
  clientId: string;
  slug: string;
  /**
   * URL prefix for all in-site links. Empty string when the site is served on
   * its own domain/subdomain (clean URLs); "/site/<slug>" on the agency host.
   */
  base: string;
  name: string;
  brand: string;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  tagline: string | null;
  primaryLocation: string | null;
  heroImageUrl: string | null;
  heroHeadline: string;
  heroSubheadline: string | null;
  services: ServiceDetail[];
  areas: SiteArea[];
  gallery: GalleryItem[];
  valueProps: string[];
  badges: string[];
  aboutHeadline: string | null;
  aboutText: string | null;
  rating: number | null;
  reviewCount: number | null;
  googleReviewLink: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  googleBusinessUrl: string | null;
  promoText: string | null;
  address: string | null;
  hours: string | null;
}

// Fetch a client + settings by slug. Cached per-request so the layout and the
// page don't double-fetch.
export const getSite = cache(
  async (slug: string): Promise<{ client: Client; settings: ClientSettings | null } | null> => {
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
);

// Cached, normalized content for a slug. Returns null if the client is unknown.
export const getSiteContent = cache(async (slug: string): Promise<SiteContent | null> => {
  const site = await getSite(slug);
  if (!site) return null;
  const content = normalizeSiteContent(site.client, site.settings);
  content.base = tenantBase(site.client.slug);
  return content;
});

// On a tenant's own domain/subdomain the site lives at the root (no prefix);
// on the agency host it lives under /site/<slug>.
function tenantBase(slug: string): string {
  const host = hostnameFrom(headers().get("host"));
  return classifyHost(host).type === "primary" ? `/site/${slug}` : "";
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSiteContent(client: Client, settings: ClientSettings | null): SiteContent {
  const name = businessName(client, settings);
  const primaryLocation = settings?.primary_location ?? settings?.service_area ?? null;

  return {
    clientId: client.id,
    slug: client.slug,
    base: `/site/${client.slug}`,
    name,
    brand: settings?.brand_color ?? "#1e3a8a",
    phone: settings?.phone ?? null,
    email: settings?.email ?? null,
    logoUrl: settings?.logo_url ?? null,
    tagline: settings?.tagline ?? null,
    primaryLocation,
    heroImageUrl: settings?.hero_image_url ?? null,
    heroHeadline:
      settings?.hero_headline ??
      (primaryLocation ? `${name} in ${primaryLocation}` : name),
    heroSubheadline: settings?.hero_subheadline ?? null,
    services: normalizeServices(settings),
    areas: normalizeAreas(settings),
    gallery: Array.isArray(settings?.gallery) ? settings!.gallery : [],
    valueProps: settings?.value_props ?? [],
    badges: settings?.badges ?? [],
    aboutHeadline: settings?.about_headline ?? null,
    aboutText: settings?.about_text ?? null,
    rating: settings?.rating ?? null,
    reviewCount: settings?.review_count ?? null,
    googleReviewLink: settings?.google_review_link ?? null,
    facebookUrl: settings?.facebook_url ?? null,
    instagramUrl: settings?.instagram_url ?? null,
    googleBusinessUrl: settings?.google_business_url ?? null,
    promoText: settings?.promo_text ?? null,
    address: settings?.address ?? null,
    hours: settings?.hours ?? null,
  };
}

// Prefer rich service_details; otherwise derive from the plain services list.
function normalizeServices(settings: ClientSettings | null): ServiceDetail[] {
  const details = settings?.service_details;
  if (Array.isArray(details) && details.length > 0) {
    return details.map((d) => ({
      slug: d.slug || slugify(d.name),
      name: d.name,
      description: d.description ?? "",
      image_url: d.image_url ?? null,
    }));
  }
  const plain = settings?.services ?? [];
  const location = settings?.primary_location ?? settings?.service_area ?? "your area";
  return plain.map((name) => ({
    slug: slugify(name),
    name,
    description: `Professional ${name.toLowerCase()} services in ${location}. Quality workmanship, honest pricing, and free estimates.`,
    image_url: null,
  }));
}

function normalizeAreas(settings: ClientSettings | null): SiteArea[] {
  const list = settings?.service_areas?.length
    ? settings.service_areas
    : settings?.service_area
      ? [settings.service_area]
      : [];
  return list.map((name) => ({ slug: slugify(name), name }));
}

// JSON-LD LocalBusiness structured data for rich results / local SEO.
export function localBusinessJsonLd(site: SiteContent, url: string) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: site.name,
    url,
    ...(site.logoUrl ? { image: site.logoUrl, logo: site.logoUrl } : {}),
    ...(site.phone ? { telephone: site.phone } : {}),
    ...(site.email ? { email: site.email } : {}),
    ...(site.address ? { address: site.address } : {}),
    ...(site.areas.length ? { areaServed: site.areas.map((a) => a.name) } : {}),
  };
  if (site.rating && site.reviewCount) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: site.rating,
      reviewCount: site.reviewCount,
    };
  }
  return data;
}
