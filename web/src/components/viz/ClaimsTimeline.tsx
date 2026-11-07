"use client";

import { useState } from "react";
import { fmtDate, fmtUnits, fmtUsdc } from "@/lib/format";
import { TableToggle, Tooltip, useWidth } from "./core";

type Claim = { key: string; symbol: string; settleAt: number; amount: string; usdcPaid: string };

/// Open claims on a payout timeline: one lane per fund, one dot per claim.
/// Every dot has a 24px hit area, so a finger finds it on a phone.
export function ClaimsTimeline({ claims, now, className }: { claims: Claim[]; now: number; className?: string }) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const lanes = Array.from(new Set(claims.map((c) => c.symbol))).sort();
  const end = Math.max(now + 7 * 86400, ...claims.map((c) => c.settleAt)) + 3 * 86400;
  const pad = { l: 72, r: 16, t: 10, b: 26 };
  const laneH = 36;
  const height = pad.t + Math.max(1, lanes.length) * laneH + pad.b;
  const w = Math.max(0, width - pad.l - pad.r);
  const sx = (t: number) => pad.l + ((t - now) / (end - now)) * w;
  const spanDays = (end - now) / 86400;
  // Space the date labels at least 60px apart, so they never collide on a phone.
  const minDays = w > 0 ? (60 * spanDays) / w : 1;
  const tickEvery = [1, 7, 14, 30, 60, 90, 180].find((d) => d >= minDays && (spanDays <= 10 || d >= 7) && (spanDays <= 40 || d >= 14) && (spanDays <= 120 || d >= 30)) ?? 365;
  const ticks = Array.from({ length: Math.floor(spanDays / tickEvery) + 1 }, (_, i) => now + i * tickEvery * 86400);
  const hovered = claims.find((c) => c.key === hover);

  return (
    <div className={className}>
      <div ref={ref} className="relative w-full" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={`${claims.length} open ${claims.length === 1 ? "claim" : "claims"} by payout date`}>
            {ticks.map((t, i) => (
              <g key={t}>
                <line x1={sx(t)} x2={sx(t)} y1={pad.t} y2={height - pad.b} stroke="var(--color-hairline)" />
                <text x={sx(t)} y={height - 8} textAnchor={i === 0 ? "start" : "middle"} className="fill-muted text-[11px] tnum">
                  {i === 0 ? "today" : new Date(t * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </text>
              </g>
            ))}
            {lanes.map((l, i) => (
              <g key={l}>
                <line x1={pad.l} x2={pad.l + w} y1={pad.t + i * laneH + laneH / 2} y2={pad.t + i * laneH + laneH / 2} stroke="var(--color-hairline)" />
                <text x={0} y={pad.t + i * laneH + laneH / 2} dy="0.32em" className="fill-ink text-[12px] font-medium">
                  {l}
                </text>
              </g>
            ))}
            {claims.map((c) => {
              const cx = sx(c.settleAt);
              const cy = pad.t + lanes.indexOf(c.symbol) * laneH + laneH / 2;
              return (
                <g
                  key={c.key}
                  tabIndex={0}
                  role="img"
                  aria-label={`${c.symbol}, ${fmtUnits(BigInt(c.amount))} units, paid ${fmtUsdc(BigInt(c.usdcPaid))}, pays ${fmtDate(c.settleAt)}`}
                  onPointerEnter={() => setHover(c.key)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(c.key)}
                  onBlur={() => setHover(null)}
                  className="outline-none"
                >
                  <circle cx={cx} cy={cy} r={12} fill="transparent" />
                  <circle cx={cx} cy={cy} r={hover === c.key ? 7 : 5} fill="var(--color-viz-1)" stroke="var(--color-surface)" strokeWidth={2} />
                </g>
              );
            })}
          </svg>
        )}
        {hovered && width > 0 && (
          <Tooltip x={sx(hovered.settleAt)} y={pad.t + lanes.indexOf(hovered.symbol) * laneH + 8} align={sx(hovered.settleAt) > width * 0.7 ? "right" : "center"}>
            <div className="font-semibold text-ink tnum">{fmtUsdc(BigInt(hovered.usdcPaid))} paid</div>
            <div className="text-muted">
              {fmtUnits(BigInt(hovered.amount))} {hovered.symbol} · pays {fmtDate(hovered.settleAt)}
            </div>
          </Tooltip>
        )}
      </div>
      <TableToggle
        caption="Open claims by payout date"
        head={["Fund", "Units", "Paid", "Pays"]}
        rows={claims.map((c) => [c.symbol, fmtUnits(BigInt(c.amount)), fmtUsdc(BigInt(c.usdcPaid)), fmtDate(c.settleAt)])}
      />
    </div>
  );
}
