// Host → tenant resolution shared by the middleware (edge) and the site
// link-base helper. Edge-safe: no Node-only or next/headers imports here.

export function hostnameFrom(hostHeader: string | null | undefined): string {
  return (hostHeader || "").split(":")[0].toLowerCase();
}

export type HostClass =
  | { type: "primary" } // the agency app: marketing, dashboard, /site/<slug>
  | { type: "subdomain"; slug: string } // <slug>.<root> — slug is the label
  | { type: "custom" }; // a client's own domain — needs a DB lookup

// Classify an incoming hostname. The feature is opt-in: until ROOT_DOMAIN is
// set, every host is treated as "primary" so nothing changes.
export function classifyHost(host: string): HostClass {
  if (!host || host === "localhost" || host === "127.0.0.1") return { type: "primary" };

  // Local dev: <slug>.localhost:3000 serves a tenant for testing.
  if (host.endsWith(".localhost")) {
    const label = host.slice(0, -".localhost".length).split(".")[0];
    return label ? { type: "subdomain", slug: label } : { type: "primary" };
  }

  // Vercel preview deployments are always the primary app.
  if (host.endsWith(".vercel.app")) return { type: "primary" };

  const root = process.env.ROOT_DOMAIN?.toLowerCase();
  if (!root) return { type: "primary" };

  if (host === root || host === `www.${root}` || host === `app.${root}`) {
    return { type: "primary" };
  }

  if (host.endsWith(`.${root}`)) {
    const label = host.slice(0, -(root.length + 1)).split(".")[0];
    return label ? { type: "subdomain", slug: label } : { type: "primary" };
  }

  // Unrelated host → a client's custom domain.
  return { type: "custom" };
}

// Best-effort domain → slug lookup against Supabase (clients are publicly
// readable). Cached per edge isolate to avoid a query on every request.
const domainCache = new Map<string, { slug: string | null; exp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function slugForDomain(host: string): Promise<string | null> {
  const now = Date.now();
  const cached = domainCache.get(host);
  if (cached && cached.exp > now) return cached.slug;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/clients?select=slug&domain=eq.${encodeURIComponent(host)}`,
      { headers: { apikey: key, authorization: `Bearer ${key}` } }
    );
    const rows = (await res.json()) as { slug: string }[];
    const slug = Array.isArray(rows) && rows[0]?.slug ? rows[0].slug : null;
    domainCache.set(host, { slug, exp: now + CACHE_TTL_MS });
    return slug;
  } catch {
    return null;
  }
}
