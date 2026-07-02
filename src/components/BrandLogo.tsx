"use client";

import Link from "next/link";
import { useState } from "react";

// Steel Scale wordmark for the marketing site. Renders the hosted logo image;
// if it fails to load it gracefully falls back to a text wordmark so the nav
// never shows a broken image.
export function BrandLogo({ className = "h-10 w-auto" }: { className?: string }) {
  const [ok, setOk] = useState(true);
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Steel Scale">
      {ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="https://steelscale.xyz/assets/logo.png"
          alt="Steel Scale"
          className={className}
          onError={() => setOk(false)}
        />
      ) : (
        <>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand font-display text-lg font-black text-white">
            S
          </span>
          <span className="font-display text-lg font-extrabold uppercase tracking-tight text-white">
            Steel Scale <span className="text-brand">Systems</span>
          </span>
        </>
      )}
    </Link>
  );
}
