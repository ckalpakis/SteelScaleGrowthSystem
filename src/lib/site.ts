import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { businessName } from "@/lib/types";
import type {
  Client,
  ClientSettings,
  ServiceDetail,
  GalleryItem,
  BadgeLogo,
  Stat,
  ProcessStep,
  Testimonial,
  FinancingOption,
  Faq,
} from "@/lib/types";
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
  /** Accent (brand) color hex. */
  // (declared below as `brand`)
  /** Secondary dark color hex, used for dark bands / footer / headings. */
  ink: string;
  brand: string;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  tagline: string | null;
  primaryLocation: string | null;
  heroImageUrl: string | null;
  heroHeadline: string;
  heroSubheadline: string | null;
  /** Homepage section headings. `*word*` marks the brand-accent portion. */
  workHeading: string;
  servicesHeading: string;
  servicesSubheading: string | null;
  services: ServiceDetail[];
  areas: SiteArea[];
  gallery: GalleryItem[];
  valueProps: string[];
  badges: string[];
  badgeLogos: BadgeLogo[];
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
  stats: Stat[];
  processSteps: ProcessStep[];
  testimonials: Testimonial[];
  financing: FinancingOption[];
  faqs: Faq[];
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

// "#0c2340" -> "12 35 64" (space-separated RGB channels for Tailwind's
// rgb(var(--ink) / <alpha-value>) so opacity modifiers keep working).
export function hexToRgbChannels(hex: string | null | undefined): string | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex ?? "").trim());
  if (!m) return null;
  return `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}`;
}

function normalizeSiteContent(client: Client, settings: ClientSettings | null): SiteContent {
  const name = businessName(client, settings);
  const primaryLocation = settings?.primary_location ?? settings?.service_area ?? null;

  return {
    clientId: client.id,
    slug: client.slug,
    base: `/site/${client.slug}`,
    name,
    ink: settings?.secondary_color ?? "#0c2340",
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
    workHeading: settings?.work_heading?.trim() || "See The Difference In Every *Shingle*",
    servicesHeading: settings?.services_heading?.trim() || "*Full-Service* Roofing & Exterior Solutions",
    servicesSubheading:
      settings?.services_subheading?.trim() ||
      "We specialize in protecting what matters most — your home.",
    services: normalizeServices(settings),
    areas: normalizeAreas(settings),
    gallery: Array.isArray(settings?.gallery) ? settings!.gallery : [],
    valueProps: settings?.value_props ?? [],
    badges: settings?.badges ?? [],
    badgeLogos: Array.isArray(settings?.badge_logos) ? settings!.badge_logos : [],
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
    stats: normalizeStats(settings),
    processSteps: normalizeProcess(settings),
    testimonials: arr(settings?.testimonials),
    financing: arr(settings?.financing),
    faqs: arr(settings?.faqs),
  };
}

function arr<T>(v: T[] | null | undefined): T[] {
  return Array.isArray(v) ? v : [];
}

// Stats: use provided stats, else derive a sensible set from rating/reviews.
function normalizeStats(settings: ClientSettings | null): Stat[] {
  const provided = settings?.stats;
  if (Array.isArray(provided) && provided.length) return provided;

  const fallback: Stat[] = [];
  if (settings?.review_count) fallback.push({ value: `${settings.review_count}+`, label: "5-Star Reviews" });
  if (settings?.rating) fallback.push({ value: `${settings.rating}★`, label: "Average Rating" });
  fallback.push({ value: "100%", label: "Satisfaction Guarantee" });
  fallback.push({ value: "Lifetime", label: "Workmanship Warranty" });
  return fallback.slice(0, 4);
}

// Process: use provided steps, else a standard (non–company-specific) flow.
function normalizeProcess(settings: ClientSettings | null): ProcessStep[] {
  const provided = settings?.process_steps;
  if (Array.isArray(provided) && provided.length) return provided;
  return [
    { title: "Call or Request a Quote", description: "Reach out and tell us what you need — it takes two minutes." },
    { title: "Free Inspection", description: "We assess your property and explain exactly what's going on." },
    { title: "Clear, Written Estimate", description: "Honest pricing with no surprises and no pressure." },
    { title: "Expert Installation", description: "Our crews get to work with quality materials and clean job sites." },
    { title: "Guaranteed Results", description: "We stand behind every job with a workmanship warranty." },
  ];
}

// Prefer rich service_details; otherwise derive from the plain services list.
// Each service gets a photo: its own image_url, else a gallery image (cycled so
// services differ), else the hero image.
function normalizeServices(settings: ClientSettings | null): ServiceDetail[] {
  const gallery = Array.isArray(settings?.gallery) ? settings!.gallery : [];
  const fallbackImages = gallery.map((g) => g.url).filter(Boolean);
  const hero = settings?.hero_image_url ?? null;
  const fallbackFor = (i: number): string | null =>
    fallbackImages.length ? fallbackImages[i % fallbackImages.length] : hero;

  const details = settings?.service_details;
  if (Array.isArray(details) && details.length > 0) {
    return details.map((d, i) => ({
      slug: d.slug || slugify(d.name),
      name: d.name,
      description: d.description ?? "",
      image_url: d.image_url ?? fallbackFor(i),
    }));
  }
  const plain = settings?.services ?? [];
  const location = settings?.primary_location ?? settings?.service_area ?? "your area";
  return plain.map((name, i) => ({
    slug: slugify(name),
    name,
    description: `Professional ${name.toLowerCase()} services in ${location}. Quality workmanship, honest pricing, and free estimates.`,
    image_url: fallbackFor(i),
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
