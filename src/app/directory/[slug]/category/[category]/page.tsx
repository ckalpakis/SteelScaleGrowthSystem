import { notFound } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { getDirectoryBySlug, getListings } from "@/lib/directory/data.server";
import { ListingCard } from "@/components/directory/parts";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: { params: { slug: string; category: string } }) {
  const admin = createAdminClient();
  const directory = await getDirectoryBySlug(admin, params.slug, { publishedOnly: true });
  if (!directory) notFound();

  const category = decodeURIComponent(params.category);
  const listings = await getListings(admin, directory.id, { category, limit: 200 });

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="text-2xl font-bold">{category}</h1>
      <p className="mt-1 text-sm text-[#8a8a8a]">{listings.length} business{listings.length === 1 ? "" : "es"}</p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((l) => (
          <ListingCard key={l.id} listing={l} slug={directory.slug} color={directory.primary_color} />
        ))}
      </div>
      {listings.length === 0 && <p className="mt-6 text-sm text-[#8a8a8a]">No businesses in this category yet.</p>}
    </div>
  );
}
