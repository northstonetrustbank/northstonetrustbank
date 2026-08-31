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
 * The curve is monotone cubic, not straight segments and not a plain spline.
 * A plain spline overshoots around a sharp move, which on this chart would
 * draw a dip in someone's balance that never happened — so the tangents are
 * flattened wherever the data turns (Fritsch–Carlson). Between two points the
 * curve only ever moves the way the balance moved.
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

/** Same greens and reds the figures use, so a rise reads the same everywhere.
 *  Darker than the dark-theme pair, because #34d399 on white is 1.92:1. */
const UP = "#047857";
const DOWN = "#b91c1c";
/** Flat, or too few points to have a direction. */
const FLAT = "#046bd4";

/** The same three on the navy hero, where the dark set would disappear. */
const UP_DARK = "#5ce0aa";
const DOWN_DARK = "#ff9b9b";
const FLAT_DARK = "#8fb6ff";

export function BalanceTrend({
  data,
  label,
  onDark = false,
}: {
  data: TrendDatum[];
  label: string;
  /** Set when the chart sits on the navy hero rather than a white card. */
  onDark?: boolean;
}) {
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

    const px = data.map((_, i) => x(i));
    const py = data.map((d) => y(d.v));
    const n = data.length;

    // Secant slopes between neighbours, then a tangent at each point.
    const slope: number[] = [];
    for (let i = 0; i < n - 1; i++) slope.push((py[i + 1] - py[i]) / (px[i + 1] - px[i]));

    const tan: number[] = new Array(n);
    tan[0] = slope[0];
    tan[n - 1] = slope[n - 2];
    for (let i = 1; i < n - 1; i++) {
      // A turning point gets a flat tangent, which is what stops the curve
      // bulging past the values on either side of it.
      tan[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
    }
    // Fritsch–Carlson: pull any tangent back inside the circle of radius 3
    // around its neighbouring secants, the condition for staying monotone.
    for (let i = 0; i < n - 1; i++) {
      if (slope[i] === 0) {
        tan[i] = 0;
        tan[i + 1] = 0;
        continue;
      }
      const a = tan[i] / slope[i];
      const b = tan[i + 1] / slope[i];
      const h = Math.hypot(a, b);
      if (h > 3) {
        tan[i] = ((3 / h) * a) * slope[i];
        tan[i + 1] = ((3 / h) * b) * slope[i];
      }
    }

    let line = `M${px[0].toFixed(2)},${py[0].toFixed(2)}`;
    for (let i = 0; i < n - 1; i++) {
      const dx = px[i + 1] - px[i];
      // Hermite to cubic Bézier: the control points sit a third of the way
      // along, carrying each end's tangent.
      const c1x = px[i] + dx / 3;
      const c1y = py[i] + (tan[i] * dx) / 3;
      const c2x = px[i + 1] - dx / 3;
      const c2y = py[i + 1] - (tan[i + 1] * dx) / 3;
      line += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${px[i + 1].toFixed(2)},${py[i + 1].toFixed(2)}`;
    }

    const area = `${line} L${W},${H} L0,${H} Z`;
    return { x, y, line, area };
  }, [data]);

  if (!geom) return null;

  const active = hover === null ? null : data[hover];

  const first = data[0].v;
  const last = data[data.length - 1].v;
  // White at 28% is invisible on a white card — which is what the crosshair
  // had been since the app went light. It follows the surface now.
  const ink = onDark ? "#ffffff" : "#04162c";
  const hue = onDark
    ? last > first ? UP_DARK : last < first ? DOWN_DARK : FLAT_DARK
    : last > first ? UP : last < first ? DOWN : FLAT;

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
        <div className="pointer-events-none absolute right-0 top-0 z-10 flex items-center gap-2 rounded-lg bg-navy-900/90 px-2 py-1 text-[11px] backdrop-blur-sm">
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
              stroke={ink}
              strokeOpacity={onDark ? 0.32 : 0.22}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            {/* A ring in the surface's own colour keeps the marker legible
                where it crosses the fill. */}
            <circle
              cx={geom.x(hover)}
              cy={geom.y(active.v)}
              r="5"
              fill={hue}
              stroke={onDark ? "#04162c" : "#ffffff"}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )}
      </svg>
    </figure>
  );
}
