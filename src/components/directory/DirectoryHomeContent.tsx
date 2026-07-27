// Shared directory home body (hero + search + featured/free grids).
// Used by both the site root (/) and /directory/[slug]. Server component.

import { createAdminClient } from "@/lib/supabase/admin";
import { getListings } from "@/lib/directory/data.server";
import type { Directory } from "@/lib/directory/types";
import { ListingCard, SearchBar } from "@/components/directory/parts";

export async function DirectoryHomeContent({ directory, q, homeAction }: { directory: Directory; q?: string; homeAction?: string }) {
  const admin = createAdminClient();
  const color = directory.primary_color;
  const query = (q ?? "").trim();
  const searchAction = homeAction ?? `/directory/${directory.slug}`;

  if (query) {
    const results = await getListings(admin, directory.id, { q: query, limit: 100 });
    return (
      <div className="mx-auto max-w-6xl px-5 py-10">
        <SearchBar action={searchAction} defaultValue={query} color={color} />
        <h1 className="mt-8 text-xl font-bold">Results for “{query}” ({results.length})</h1>
        <Grid>{results.map((l) => <ListingCard key={l.id} listing={l} slug={directory.slug} color={color} />)}</Grid>
        {results.length === 0 && <p className="mt-6 text-sm text-[#8a8a8a]">No businesses matched your search.</p>}
      </div>
    );
  }

  const all = await getListings(admin, directory.id, { limit: 120 });
  const premium = all.filter((l) => l.tier === "premium");
  const free = all.filter((l) => l.tier === "free");

  return (
    <div>
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
            <SearchBar action={searchAction} color={color} />
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
          {all.length === 0 ? (
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
