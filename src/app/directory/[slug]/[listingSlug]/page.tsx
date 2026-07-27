import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { getDirectoryBySlug, getListingBySlug } from "@/lib/directory/data.server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string; listingSlug: string } }): Promise<Metadata> {
  const admin = createAdminClient();
  const directory = await getDirectoryBySlug(admin, params.slug, { publishedOnly: true });
  if (!directory) return { title: "Not found" };
  const listing = await getListingBySlug(admin, directory.id, params.listingSlug);
  if (!listing) return { title: "Not found" };
  return {
    title: `${listing.business_name} — ${directory.name}`,
    description: listing.description || `${listing.business_name}${listing.city ? ` in ${listing.city}` : ""}.`,
  };
}

export default async function ListingPage({ params }: { params: { slug: string; listingSlug: string } }) {
  const admin = createAdminClient();
  const directory = await getDirectoryBySlug(admin, params.slug, { publishedOnly: true });
  if (!directory) notFound();
  const listing = await getListingBySlug(admin, directory.id, params.listingSlug);
  if (!listing || listing.status !== "published") notFound();

  const color = directory.primary_color;
  const address = [listing.address, listing.city, listing.state, listing.postal_code].filter(Boolean).join(", ");

  // JSON-LD for SEO.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: listing.business_name,
    ...(listing.description ? { description: listing.description } : {}),
    ...(listing.phone ? { telephone: listing.phone } : {}),
    ...(listing.website ? { url: listing.website } : {}),
    ...(listing.image_url ? { image: listing.image_url } : {}),
    ...(address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: listing.address || undefined,
            addressLocality: listing.city || undefined,
            addressRegion: listing.state || undefined,
            postalCode: listing.postal_code || undefined,
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href={`/directory/${directory.slug}`} className="text-sm text-[#6b6b6b] hover:underline">← Back to {directory.name}</Link>

      <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="h-52 w-full bg-black/5">
          {listing.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.image_url} alt={listing.business_name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl font-bold text-black/15">{listing.business_name.charAt(0)}</div>
          )}
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2">
            {listing.tier === "premium" && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-black">★ Premium</span>}
            {listing.category && <span className="text-xs font-medium" style={{ color }}>{listing.category}</span>}
          </div>
          <h1 className="mt-1 text-2xl font-extrabold">{listing.business_name}</h1>
          {listing.description && <p className="mt-3 text-[15px] leading-relaxed text-[#4b4b4b]">{listing.description}</p>}

          <dl className="mt-5 space-y-2 text-sm">
            {address && <Row label="Address" value={address} />}
            {listing.phone && <Row label="Phone" value={listing.phone} href={`tel:${listing.phone}`} />}
            {listing.website && <Row label="Website" value={listing.website} href={listing.website} external />}
            {listing.email && <Row label="Email" value={listing.email} href={`mailto:${listing.email}`} />}
          </dl>

          {listing.website && (
            <a href={listing.website} target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-md px-5 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: color }}>
              Visit website ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, href, external }: { label: string; value: string; href?: string; external?: boolean }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-[#8a8a8a]">{label}</dt>
      <dd className="min-w-0 break-words text-[#1f1f1f]">
        {href ? (
          <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
