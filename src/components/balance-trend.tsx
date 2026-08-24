"use client";

import { useId, useMemo, useRef, useState } from "react";

/**
 * The balance over time, drawn on the dark balance card.
 *
 * One series, so there is no legend — the card's own label names it. The line
 * is 2px on a recessive baseline, the fill is that same hue fading out, and
 * hovering anywhere reveals a crosshair with that day's figure. The hit area is
 * the full plot rather than the line itself, so it is reachable on a phone.
 *
 * The hue is the direction the balance went over the period — green up, red
 * down — matching the percentage chip beside it. It was fixed blue, which meant
 * the two could disagree about the same number.
 */

/** Each point arrives pre-formatted, so Intl stays on the server. */
export type TrendDatum = { v: number; date: string; value: string };

const W = 600; // viewBox units; the SVG scales to its container
const H = 72;
const PAD_Y = 10;

/** Same greens and reds the figures use, so a rise reads the same everywhere. */
const UP = "#34d399";
const DOWN = "#f87171";
/** Flat, or too few points to have a direction. */
const FLAT = "#5b8def";

export function BalanceTrend({ data, label }: { data: TrendDatum[]; label: string }) {
  const gradientId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const geom = useMemo(() => {
    if (data.length < 2) return null;
    const values = data.map((d) => d.v);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;

    const x = (i: number) => (i / (data.length - 1)) * W;
    const y = (v: number) => PAD_Y + (1 - (v - min) / span) * (H - PAD_Y * 2);

    const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(d.v).toFixed(2)}`).join(" ");
    const area = `${line} L${W},${H} L0,${H} Z`;
    return { x, y, line, area };
  }, [data]);

  if (!geom) return null;

  const active = hover === null ? null : data[hover];

  const first = data[0].v;
  const last = data[data.length - 1].v;
  const hue = last > first ? UP : last < first ? DOWN : FLAT;

  function onMove(event: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const i = Math.round(ratio * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  }

  return (
    <figure className="relative m-0">
      <figcaption className="sr-only">{label}</figcaption>

      {/* Read-out floats over the plot's top-right rather than taking a row */}
      {active && (
        <div className="pointer-events-none absolute right-0 top-0 z-10 flex items-center gap-2 rounded-lg bg-navy-950/80 px-2 py-1 text-[11px] backdrop-blur-sm">
          <span className="tnum text-navy-300">{active.date}</span>
          <span className="tnum font-semibold text-white">{active.value}</span>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-14 w-full touch-none"
        role="img"
        aria-label={label}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={hue} stopOpacity="0.38" />
            <stop offset="100%" stopColor={hue} stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={geom.area} fill={`url(#${gradientId})`} />
        <path
          d={geom.line}
          fill="none"
          stroke={hue}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {active && hover !== null && (
          <g>
            <line
              x1={geom.x(hover)}
              y1={0}
              x2={geom.x(hover)}
              y2={H}
              stroke="#ffffff"
              strokeOpacity="0.28"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            {/* 2px surface ring keeps the marker legible over the fill */}
            <circle
              cx={geom.x(hover)}
              cy={geom.y(active.v)}
              r="5"
              fill={hue}
              stroke="#061530"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )}
      </svg>
    </figure>
  );
}
