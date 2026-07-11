// Reusable, dependency-free charts for the Reputation module. Server-safe
// (no client hooks) and responsive via viewBox / flex.

export interface ChartPoint {
  label: string;
  value: number;
}

// Area + line chart (e.g. Review Growth). Fills width; crisp line via a
// non-scaling stroke so the viewBox can stretch freely.
export function AreaChart({
  data,
  height = 180,
  gradientId = "repArea",
}: {
  data: ChartPoint[];
  height?: number;
  gradientId?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;
  const x = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);
  const y = (v: number) => 100 - (v / max) * 100;
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.value)}`).join(" ");
  const area = `${line} L 100 100 L 0 100 Z`;

  return (
    <div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke="#1e3a8a"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-[#9b9a97]">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

// Vertical bar chart (e.g. Requests Sent Per Month). Pure CSS — fully fluid.
export function BarChart({ data, height = 180 }: { data: ChartPoint[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d) => (
          <div key={d.label} className="group flex flex-1 flex-col justify-end">
            <div
              className="w-full rounded-t-md bg-brand/20 transition-colors group-hover:bg-brand/40"
              style={{ height: `${(d.value / max) * 100}%` }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center text-[11px] text-[#9b9a97]">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
