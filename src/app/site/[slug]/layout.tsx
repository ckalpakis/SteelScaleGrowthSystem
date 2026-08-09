import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSiteContent, localBusinessJsonLd, hexToRgbChannels } from "@/lib/site";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// Per-client favicon for the whole tenant site. getSiteContent is request-
// cached, so this doesn't add a second fetch. Pages under this layout keep
// their own title/description; icons are inherited from here.
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const site = await getSiteContent(params.slug);
  if (!site?.faviconUrl) return {};
  return { icons: { icon: site.faviconUrl, shortcut: site.faviconUrl, apple: site.faviconUrl } };
}

// Shared chrome for a tenant's entire website. Sets the brand accent via the
// --brand CSS variable (consumed by .bg-client / .text-client / .ring-client)
// and injects LocalBusiness structured data for SEO.
export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const site = await getSiteContent(params.slug);
  if (!site) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const jsonLd = localBusinessJsonLd(site, `${baseUrl}/site/${site.slug}`);
  const inkChannels = hexToRgbChannels(site.ink) ?? "12 35 64";

  return (
    <div
      style={{ ["--brand" as string]: site.brand, ["--ink" as string]: inkChannels }}
      className="flex min-h-screen flex-col bg-white"
    >
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader site={site} />
      <div className="flex-1">{children}</div>
      <SiteFooter site={site} />
    </div>
  );
}
