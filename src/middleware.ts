import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { hostnameFrom, classifyHost, slugForDomain } from "@/lib/tenant";

// Diagnostic header so we can SEE what the running middleware resolves for a
// host (open the page in DevTools → Network → the document → Response Headers →
// `x-ss-tenant`). Safe to remove once tenant routing is confirmed.
function debug(res: Response, host: string, detail: string): Response {
  res.headers.set("x-ss-tenant", `host=${host};root=${process.env.ROOT_DOMAIN ? "set:" + process.env.ROOT_DOMAIN : "UNSET"};${detail}`);
  return res;
}

// Two jobs:
//  1. On the agency app host → refresh the Supabase session / guard /dashboard.
//  2. On a client host (custom domain or <slug>.<root> subdomain) → serve that
//     tenant's site at the domain root by rewriting to /site/<slug>/...
export async function middleware(request: NextRequest) {
  const host = hostnameFrom(request.headers.get("host"));
  const cls = classifyHost(host);

  // Primary app host: unchanged behavior.
  if (cls.type === "primary") {
    return debug(await updateSession(request), host, "class=primary");
  }

  // Resolve the tenant slug from the host.
  const slug = cls.type === "subdomain" ? cls.slug : await slugForDomain(host);

  // Unknown client host → fall back to the normal app rather than erroring.
  if (!slug) {
    return debug(await updateSession(request), host, `class=${cls.type};slug=none`);
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
    pathname.startsWith("/onboard/") || // public onboarding links resolve on any host
    pathname === "/onboard" ||
    pathname.startsWith("/directory/") || // public directory pages resolve on any host
    pathname.includes(".")
  ) {
    return debug(NextResponse.next(), host, `class=${cls.type};slug=${slug};passthrough`);
  }

  // bluebuiltroofs.com/services  →  /site/<slug>/services  (host/URL unchanged)
  const url = request.nextUrl.clone();
  url.pathname = `/site/${slug}${pathname === "/" ? "" : pathname}`;
  return debug(NextResponse.rewrite(url), host, `class=${cls.type};slug=${slug};rewrite=${url.pathname}`);
}

export const config = {
  // Run on everything except static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
