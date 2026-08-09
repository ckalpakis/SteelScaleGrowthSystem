"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { formatMoney, type TimePoint } from "@/lib/analytics";

// =============================================================================
// Lightweight, dependency-free SVG charts for the client dashboard.
// Each chart measures its container so lines/points render crisp (no viewBox
// stretching) and hover math stays accurate.
// =============================================================================

const BLUE = "#2563eb";
const GREEN = "#16a34a";

// Measure a container's pixel width so SVG coordinates map 1:1.
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(entry.contentRect.width));
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

// ---------------------------------------------------------------------------
// Leads over time — toggle between a Leads view (leads + won overlay) and a
// Revenue view (won revenue per bucket). Area + line with hover tooltips.
// ---------------------------------------------------------------------------
type Metric = "leads" | "revenue";

export function LeadsLineChart({ series }: { series: TimePoint[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [metric, setMetric] = useState<Metric>("leads");

  const isRevenue = metric === "revenue";
  const color = isRevenue ? GREEN : BLUE;
  const fillId = isRevenue ? "revenueFill" : "leadsFill";

  const H = 280;
  const padL = isRevenue ? 52 : 34; // money labels need more room
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const innerW = Math.max(0, width - padL - padR);
  const innerH = H - padT - padB;

  const valueOf = (p: TimePoint) => (isRevenue ? p.revenue : p.leads);
  const max = Math.max(1, ...series.map(valueOf));
  const niceMax = niceCeil(max);
  const n = series.length;

  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1));
  const y = (v: number) => padT + innerH - (innerH * v) / niceMax;

  const linePath = series.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(valueOf(p))}`).join(" ");
  const areaPath =
    n > 0
      ? `${linePath} L ${x(n - 1)} ${padT + innerH} L ${x(0)} ${padT + innerH} Z`
      : "";
  // "Won" overlay only in the leads view.
  const hasWon = !isRevenue && series.some((p) => p.won > 0);
  const wonPath = series.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.won)}`).join(" ");

  const ticks = [0, Math.round(niceMax / 2), niceMax].filter((v, i, a) => a.indexOf(v) === i);
  const fmtTick = (t: number) => (isRevenue ? formatMoney(t) : String(t));
  const labelStep = Math.max(1, Math.ceil(n / 6));

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!width || n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round(((px - padL) / (innerW || 1)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  return (
    <div className="w-full">
      {/* Legend + metric toggle */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
            {isRevenue ? "Won revenue" : "Leads"}
          </span>
          {hasWon && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-full" style={{ background: GREEN }} /> Won
            </span>
          )}
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          {(["leads", "revenue"] as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={
                "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition " +
                (m === metric ? "bg-brand text-white" : "text-gray-600 hover:bg-gray-100")
              }
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div ref={ref} className="relative w-full">
        {width > 0 && (
          <svg width={width} height={H} onMouseMove={onMove} onMouseLeave={() => setHover(null)} className="block">
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>

            {ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke="#eef2f7" strokeWidth={1} />
                <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#9ca3af">
                  {fmtTick(t)}
                </text>
              </g>
            ))}

            {areaPath && <path d={areaPath} fill={`url(#${fillId})`} />}
            {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
            {hasWon && wonPath && (
              <path d={wonPath} fill="none" stroke={GREEN} strokeWidth={2} strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" />
            )}

            {series.map((p, i) =>
              i % labelStep === 0 || i === n - 1 ? (
                <text key={p.key} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="#9ca3af">
                  {p.label}
                </text>
              ) : null
            )}

            {hover != null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3 3" />
                <circle cx={x(hover)} cy={y(valueOf(series[hover]))} r={4.5} fill={color} stroke="#fff" strokeWidth={2} />
                {hasWon && <circle cx={x(hover)} cy={y(series[hover].won)} r={4} fill={GREEN} stroke="#fff" strokeWidth={2} />}
              </g>
            )}
          </svg>
        )}

        {hover != null && width > 0 && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg"
            style={{ left: Math.min(Math.max(x(hover), 60), width - 60), top: 4 }}
          >
            <div className="font-semibold text-gray-900">{series[hover].label}</div>
            <div className="mt-1 flex items-center gap-1.5 text-gray-600">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
              {isRevenue
                ? `${formatMoney(series[hover].revenue)} won`
                : `${series[hover].leads} lead${series[hover].leads === 1 ? "" : "s"}`}
            </div>
            {hasWon && (
              <div className="mt-0.5 flex items-center gap-1.5 text-gray-600">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: GREEN }} />
                {series[hover].won} won
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pipeline stage distribution — donut with center total + legend.
// ---------------------------------------------------------------------------
export function StageDonut({
  data,
  total,
}: {
  data: { label: string; count: number; color: string }[];
  total: number;
}) {
  const size = 176;
  const stroke = 26;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  let offset = 0;
  const segments = total
    ? data
        .filter((d) => d.count > 0)
        .map((d) => {
          const frac = d.count / total;
          const seg = { ...d, dash: frac * c, gap: c - frac * c, offset: -offset * c };
          offset += frac;
          return seg;
        })
    : [];

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
          {segments.map((s) => (
            <circle
              key={s.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={s.offset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900">{total}</span>
          <span className="text-xs text-gray-500">Total leads</span>
        </div>
      </div>
      <ul className="w-full space-y-2">
        {data.map((d) => (
          <li key={d.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-gray-600">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
              {d.label}
            </span>
            <span className="font-semibold text-gray-900">
              {d.count}
              <span className="ml-1 text-xs font-normal text-gray-400">
                {total ? Math.round((d.count / total) * 100) : 0}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lead sources — horizontal bars (pure CSS, responsive).
// ---------------------------------------------------------------------------
export function SourceBars({ data }: { data: { name: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">No lead sources yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.name}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-gray-600">{d.name}</span>
            <span className="font-semibold text-gray-900">{d.count}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-brand" style={{ width: `${(d.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Round a max value up to a clean axis bound (1,2,5,10,20,...).
function niceCeil(v: number): number {
  if (v <= 5) return Math.max(1, Math.ceil(v));
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}
