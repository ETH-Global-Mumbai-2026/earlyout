"use client";

import { useMemo, useState } from "react";
import { TableToggle, Tooltip, useWidth } from "./core";

type Mark = { days: number; label: string };

/// Total spread against days to payout, from the vault's own formula:
/// base + usage + credit + vol × √(days / 365). Single series, so no legend box.
export function SpreadCurve({
  baseBps,
  utilBps,
  creditBps,
  volBps,
  marks = [],
  maxDays = 180,
  height = 200,
  className,
}: {
  baseBps: number;
  utilBps: number;
  creditBps: number;
  volBps: number;
  marks?: Mark[];
  maxDays?: number;
  height?: number;
  className?: string;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hoverDay, setHoverDay] = useState<number | null>(null);
  const spread = (d: number) => (baseBps + utilBps + creditBps + volBps * Math.sqrt(Math.max(0, d) / 365)) / 100;

  const pad = { l: 40, r: 14, t: 14, b: 26 };
  const w = Math.max(0, width - pad.l - pad.r);
  const h = height - pad.t - pad.b;
  const yMax = Math.max(2, Math.ceil(spread(maxDays) + 0.5));
  const yStep = yMax <= 4 ? 1 : 2;
  const yTicks = Array.from({ length: Math.floor(yMax / yStep) + 1 }, (_, i) => i * yStep);
  const xTicks = [0, 30, 60, 90, 120, 150, 180].filter((d) => d <= maxDays);
  const sx = (d: number) => pad.l + (d / maxDays) * w;
  const sy = (v: number) => pad.t + h - (v / yMax) * h;

  const path = useMemo(() => {
    if (!w) return { line: "", area: "" };
    const pts: string[] = [];
    for (let i = 0; i <= 120; i++) {
      const d = (i / 120) ** 2 * maxDays; // denser near zero, where the curve bends
      pts.push(`${sx(d).toFixed(1)},${sy(spread(d)).toFixed(1)}`);
    }
    const line = "M" + pts.join("L");
    return { line, area: `${line}L${sx(maxDays)},${sy(0)}L${sx(0)},${sy(0)}Z` };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, yMax, baseBps, utilBps, creditBps, volBps, maxDays]);

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const d = Math.round(((e.clientX - r.left) / r.width) * maxDays);
    setHoverDay(Math.min(maxDays, Math.max(0, d)));
  };

  const label = `Spread rises with time to payout, from ${spread(0).toFixed(2)}% for a claim due now to ${spread(maxDays).toFixed(2)}% at ${maxDays} days.`;

  return (
    <div className={className}>
      <div ref={ref} className="relative w-full" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={label} className="overflow-visible">
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={pad.l + w} y1={sy(t)} y2={sy(t)} stroke="var(--color-hairline)" />
                <text x={pad.l - 8} y={sy(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tnum">
                  {t}%
                </text>
              </g>
            ))}
            {xTicks.map((d) => (
              <text key={d} x={sx(d)} y={height - 6} textAnchor="middle" className="fill-muted text-[11px] tnum">
                {d === 0 ? "now" : `${d}d`}
              </text>
            ))}
            <path d={path.area} fill="var(--color-viz-1)" opacity={0.1} />
            <path d={path.line} fill="none" stroke="var(--color-viz-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {marks.map((m) => {
              const cx = sx(m.days);
              const cy = sy(spread(m.days));
              const right = cx > pad.l + w * 0.7;
              return (
                <g key={m.label}>
                  <circle cx={cx} cy={cy} r={5} fill="var(--color-viz-1)" stroke="var(--color-surface)" strokeWidth={2} />
                  <text x={cx + (right ? -8 : 8)} y={cy + 18} textAnchor={right ? "end" : "start"} className="fill-ink text-[11px] font-semibold tnum">
                    {m.label} · {spread(m.days).toFixed(2)}%
                  </text>
                </g>
              );
            })}
            {hoverDay !== null && (
              <g pointerEvents="none">
                <line x1={sx(hoverDay)} x2={sx(hoverDay)} y1={pad.t} y2={pad.t + h} stroke="var(--color-muted)" strokeWidth={1} />
                <circle cx={sx(hoverDay)} cy={sy(spread(hoverDay))} r={4} fill="var(--color-viz-1)" stroke="var(--color-surface)" strokeWidth={2} />
              </g>
            )}
            <rect
              x={pad.l}
              y={pad.t}
              width={w}
              height={h}
              fill="transparent"
              onPointerMove={onMove}
              onPointerLeave={() => setHoverDay(null)}
              style={{ touchAction: "pan-y" }}
            />
          </svg>
        )}
        {hoverDay !== null && width > 0 && (
          <Tooltip x={sx(hoverDay)} y={sy(spread(hoverDay))} align={sx(hoverDay) > width * 0.75 ? "right" : sx(hoverDay) < width * 0.25 ? "left" : "center"}>
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-3 rounded-full bg-viz-1" />
              <span className="font-semibold text-ink tnum">{spread(hoverDay).toFixed(2)}%</span>
              <span className="text-muted">{hoverDay === 0 ? "due now" : `${hoverDay} days to payout`}</span>
            </div>
          </Tooltip>
        )}
      </div>
      <TableToggle
        caption="Spread by days to payout"
        head={["Days to payout", "Spread"]}
        rows={[0, 7, 30, 60, 90, 180].filter((d) => d <= maxDays).map((d) => [d, `${spread(d).toFixed(2)}%`])}
      />
    </div>
  );
}
