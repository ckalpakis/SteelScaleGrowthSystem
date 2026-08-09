// Public directory UI parts (server components). Branding-aware via `color`.

import Link from "next/link";

import type { Directory, DirectoryListing } from "@/lib/directory/types";

export function DirectoryHeader({
  directory,
  categories,
  homeHref,
}: {
  directory: Directory;
  categories: string[];
  homeHref?: string;
}) {
  const base = `/directory/${directory.slug}`;
  const home = homeHref ?? base;
  return (
    <header className="border-b border-black/10 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
        <Link href={home} className="flex items-center gap-2.5">
          {directory.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={directory.logo_url} alt={directory.name} className="h-8 w-auto" />
          ) : (
            <span className="text-lg font-bold" style={{ color: directory.primary_color }}>
              {directory.name}
            </span>
          )}
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#4b4b4b]">
          <Link href={home} className="hover:underline">Home</Link>
          {categories.slice(0, 8).map((c) => (
            <Link key={c} href={`${base}/category/${encodeURIComponent(c)}`} className="hover:underline">
              {c}
            </Link>
          ))}
        </nav>
        {/* Client login — for businesses/agency members with an account. */}
        <Link
          href="/login"
          className="ml-auto rounded-md border border-black/15 px-3.5 py-1.5 text-sm font-medium text-[#1f1f1f] hover:bg-black/[0.04]"
        >
          Client login
        </Link>
      </div>
    </header>
  );
}

export function DirectoryFooter({ directory }: { directory: Directory }) {
  return (
    <footer className="mt-16 border-t border-black/10 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-8 text-sm text-[#8a8a8a]">
        © {new Date().getFullYear()} {directory.name}. All rights reserved.
      </div>
    </footer>
  );
}

export function SearchBar({ action, defaultValue, color }: { action: string; defaultValue?: string; color: string }) {
  return (
    <form action={action} method="get" className="flex w-full max-w-xl gap-2">
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder="Search businesses…"
        className="w-full rounded-md border border-black/15 bg-white px-4 py-2.5 text-[15px] text-[#1f1f1f] placeholder-black/40 focus:outline-none focus:ring-2"
        style={{ boxShadow: "none" }}
      />
      <button type="submit" className="rounded-md px-5 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: color }}>
        Search
      </button>
    </form>
  );
}

export function ListingCard({ listing, slug, color }: { listing: DirectoryListing; slug: string; color: string }) {
  const premium = listing.tier === "premium";
  return (
    <Link
      href={`/directory/${slug}/${listing.slug}`}
      className={`flex flex-col overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-md ${premium ? "border-amber-300" : "border-black/10"}`}
    >
      <div className="relative h-36 w-full bg-black/5">
        {listing.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.image_url} alt={listing.business_name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl font-bold text-black/20">
            {listing.business_name.charAt(0)}
          </div>
        )}
        {premium && (
          <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-black">★ Premium</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="text-sm font-semibold text-[#1f1f1f]">{listing.business_name}</div>
        {listing.category && <div className="mt-0.5 text-xs" style={{ color }}>{listing.category}</div>}
        {listing.description && <p className="mt-2 line-clamp-2 text-xs text-[#6b6b6b]">{listing.description}</p>}
        {(listing.city || listing.state) && (
          <div className="mt-auto pt-2 text-xs text-[#8a8a8a]">{[listing.city, listing.state].filter(Boolean).join(", ")}</div>
        )}
      </div>
    </Link>
  );
}
