// Inline 5-star rating display. `value` is 0–5; renders filled/half via width.
export function Stars({ value, className = "" }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className={`relative inline-block leading-none ${className}`} aria-label={`${value} out of 5 stars`}>
      <span className="text-gray-300">★★★★★</span>
      <span className="absolute left-0 top-0 overflow-hidden text-amber-400" style={{ width: `${pct}%` }}>
        ★★★★★
      </span>
    </span>
  );
}
