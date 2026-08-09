// Scrolling brand band. Shows the logo + business name repeated with a
// brand-color diamond separator, looping seamlessly.
export function Marquee({ text, logoUrl }: { text: string; logoUrl?: string | null }) {
  const items = Array.from({ length: 6 });
  return (
    <div className="overflow-hidden bg-ink-800 py-3">
      <div className="flex w-max animate-marquee">
        {[0, 1].map((group) => (
          <div key={group} className="flex shrink-0" aria-hidden={group === 1}>
            {items.map((_, i) => (
              <span key={i} className="flex items-center gap-4 px-5">
                {logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="h-6 w-auto object-contain opacity-90 brightness-0 invert" />
                )}
                <span className="font-display text-sm font-extrabold uppercase tracking-[0.15em] text-white/90">
                  {text}
                </span>
                <span className="text-lg text-client">◆</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
