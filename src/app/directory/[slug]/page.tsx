import { notFound } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { getDirectoryBySlug, getListings } from "@/lib/directory/data.server";
import { ListingCard, SearchBar } from "@/components/directory/parts";

export const dynamic = "force-dynamic";

export default async function DirectoryHome({ params, searchParams }: { params: { slug: string }; searchParams: { q?: string } }) {
  const admin = createAdminClient();
  const directory = await getDirectoryBySlug(admin, params.slug, { publishedOnly: true });
  if (!directory) notFound();

  const q = (searchParams.q ?? "").trim();
  const color = directory.primary_color;

  if (q) {
    const results = await getListings(admin, directory.id, { q, limit: 100 });
    return (
      <div className="mx-auto max-w-6xl px-5 py-10">
        <SearchBar slug={directory.slug} defaultValue={q} color={color} />
        <h1 className="mt-8 text-xl font-bold">Results for “{q}” ({results.length})</h1>
        <Grid>
          {results.map((l) => <ListingCard key={l.id} listing={l} slug={directory.slug} color={color} />)}
        </Grid>
        {results.length === 0 && <p className="mt-6 text-sm text-[#8a8a8a]">No businesses matched your search.</p>}
      </div>
    );
  }

  const [premium, free] = await Promise.all([
    getListings(admin, directory.id, { limit: 12 }).then((all) => all.filter((l) => l.tier === "premium")),
    getListings(admin, directory.id, { limit: 60 }).then((all) => all.filter((l) => l.tier === "free")),
  ]);

  return (
    <div>
      {/* Hero */}
      <section
        className="relative flex min-h-[320px] items-center justify-center px-5 py-16 text-center"
        style={{
          backgroundColor: color,
          backgroundImage: directory.hero_image_url ? `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)), url(${directory.hero_image_url})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="w-full max-w-3xl">
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">{directory.hero_title || directory.name}</h1>
          {(directory.hero_subtitle || directory.tagline) && (
            <p className="mx-auto mt-3 max-w-xl text-white/90">{directory.hero_subtitle || directory.tagline}</p>
          )}
          <div className="mt-6 flex justify-center">
            <SearchBar slug={directory.slug} color={color} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-10">
        {premium.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-lg font-bold">Featured businesses</h2>
            <Grid>{premium.map((l) => <ListingCard key={l.id} listing={l} slug={directory.slug} color={color} />)}</Grid>
          </section>
        )}
        <section>
          <h2 className="mb-4 text-lg font-bold">Local businesses</h2>
          {free.length === 0 && premium.length === 0 ? (
            <p className="text-sm text-[#8a8a8a]">No businesses listed yet.</p>
          ) : (
            <Grid>{free.map((l) => <ListingCard key={l.id} listing={l} slug={directory.slug} color={color} />)}</Grid>
          )}
        </section>
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
