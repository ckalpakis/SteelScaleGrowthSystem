"use client";

import { useRef, useState } from "react";
import { Stars } from "./Stars";
import type { Testimonial } from "@/lib/types";

// Horizontal, snap-scrolling review carousel with dots + prev/next controls.
// Shows one card on mobile and two on wider screens.
export function ReviewsCarousel({ items }: { items: Testimonial[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function scrollToIndex(i: number) {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(items.length - 1, i));
    const card = track.children[clamped] as HTMLElement | undefined;
    if (card) track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: "smooth" });
  }

  function onScroll() {
    const track = trackRef.current;
    if (!track) return;
    const children = Array.from(track.children) as HTMLElement[];
    let nearest = 0;
    let min = Infinity;
    children.forEach((c, i) => {
      const d = Math.abs(c.offsetLeft - track.offsetLeft - track.scrollLeft);
      if (d < min) {
        min = d;
        nearest = i;
      }
    });
    setActive(nearest);
  }

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 sm:gap-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((t, i) => (
          <figure
            key={i}
            className="flex w-full shrink-0 snap-start flex-col rounded-2xl bg-white p-6 shadow-card sm:p-7 lg:w-[calc(50%-0.75rem)]"
          >
            <Stars value={t.rating ?? 5} className="text-lg" />
            <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-slate-700">“{t.quote}”</blockquote>
            <figcaption className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-client-tint font-display text-lg font-extrabold text-client">
                {t.name.charAt(0)}
              </span>
              <div>
                <div className="font-semibold text-ink">{t.name}</div>
                {t.location && <div className="text-xs text-slate-500">{t.location}</div>}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to review ${i + 1}`}
              onClick={() => scrollToIndex(i)}
              className={`h-2.5 rounded-full transition-all ${i === active ? "w-6 bg-client" : "w-2.5 bg-slate-300 hover:bg-slate-400"}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <CarouselArrow label="Previous" onClick={() => scrollToIndex(active - 1)} disabled={active === 0}>
            ‹
          </CarouselArrow>
          <CarouselArrow label="Next" onClick={() => scrollToIndex(active + 1)} disabled={active >= items.length - 1}>
            ›
          </CarouselArrow>
        </div>
      </div>
    </div>
  );
}

function CarouselArrow({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-bold text-ink transition hover:border-client hover:text-client disabled:opacity-40"
    >
      {children}
    </button>
  );
}
