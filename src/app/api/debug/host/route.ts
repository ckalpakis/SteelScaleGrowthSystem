import { NextResponse } from "next/server";
import { hostnameFrom, classifyHost, slugForDomain } from "@/lib/tenant";

// Diagnostic: reports what the LIVE deployment sees for the requesting host —
// the ROOT_DOMAIN it's running with, how it classifies the host, and the slug
// it resolves. Visit https://<the-domain>/api/debug/host. No secrets exposed
// (ROOT_DOMAIN and slugs are public). Safe to remove once domains are working.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const host = hostnameFrom(request.headers.get("host"));
  const cls = classifyHost(host);
  const resolvedSlug =
    cls.type === "custom" ? await slugForDomain(host) : cls.type === "subdomain" ? cls.slug : null;

  return NextResponse.json({
    host,
    rootDomain: process.env.ROOT_DOMAIN ?? "(not set)",
    classification: cls.type, // "primary" = served as the agency app (landing/dashboard)
    resolvedSlug, // the client this host maps to, or null
    willServe:
      cls.type === "primary"
        ? "agency landing/dashboard"
        : resolvedSlug
          ? `client site: ${resolvedSlug}`
          : "agency landing (no client matched this host)",
  });
}
