// Scrolling brand band (BlueBuilt-style). Repeats the business name with a
// brand-color diamond separator, looping seamlessly.
export function Marquee({ text }: { text: string }) {
  const items = Array.from({ length: 6 });
  return (
    <div className="overflow-hidden bg-ink-800 py-3">
      <div className="flex w-max animate-marquee">
        {[0, 1].map((group) => (
          <div key={group} className="flex shrink-0" aria-hidden={group === 1}>
            {items.map((_, i) => (
              <span
                key={i}
                className="flex items-center gap-5 px-5 font-display text-sm font-extrabold uppercase tracking-[0.15em] text-white/90"
              >
                {text}
                <span className="text-client">◆</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
