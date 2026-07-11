import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { hostnameFrom, classifyHost, slugForDomain } from "@/lib/tenant";

// Two jobs:
//  1. On the agency app host → refresh the Supabase session / guard /dashboard.
//  2. On a client host (custom domain or <slug>.<root> subdomain) → serve that
//     tenant's site at the domain root by rewriting to /site/<slug>/...
export async function middleware(request: NextRequest) {
  const host = hostnameFrom(request.headers.get("host"));
  const cls = classifyHost(host);

  // Primary app host: unchanged behavior.
  if (cls.type === "primary") {
    return await updateSession(request);
  }

  // Resolve the tenant slug from the host.
  const slug = cls.type === "subdomain" ? cls.slug : await slugForDomain(host);

  // Unknown client host → fall back to the normal app rather than erroring.
  if (!slug) {
    return await updateSession(request);
  }

  const { pathname } = request.nextUrl;

  // Let assets, API (lead capture!), auth, and already-prefixed paths pass
  // through untouched — only "clean" page paths get rewritten.
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/site/") ||
    pathname.startsWith("/r/") || // tracked review short links resolve on any host
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // bluebuiltroofs.com/services  →  /site/<slug>/services  (host/URL unchanged)
  const url = request.nextUrl.clone();
  url.pathname = `/site/${slug}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Run on everything except static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
