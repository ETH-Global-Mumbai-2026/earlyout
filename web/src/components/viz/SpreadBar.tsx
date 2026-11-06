"use client";

import { useState } from "react";
import { fmtBps } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TERM_COLORS, TERM_INK, TERM_NAMES, Tooltip, useWidth } from "./core";

/// A tall segmented bar: the whole spread, split into its four terms.
/// Each block's width is its share of the spread; a block too narrow for its
/// label prints none (hover, focus and the accessible name still carry it).
export function SpreadBar({ bps, legend = true, thin = false, className }: { bps: [number, number, number, number]; legend?: boolean; thin?: boolean; className?: string }) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const total = bps.reduce((a, b) => a + b, 0);
  const gap = 2;
  const live = bps.map((b, i) => ({ b, i })).filter(({ b }) => b > 0);
  const usable = Math.max(0, width - gap * (live.length - 1));
  const widths = live.map(({ b }) => (total ? (b / total) * usable : 0));
  const blocks = live.map(({ b, i }, k) => ({
    i,
    b,
    w: widths[k],
    x: widths.slice(0, k).reduce((a, w) => a + w + gap, 0),
    share: total ? Math.round((b / total) * 100) : 0,
  }));
  const summary = `Spread ${fmtBps(total)}: ` + bps.map((b, i) => `${TERM_NAMES[i]} ${fmtBps(b)}`).join(", ");

  return (
    <div className={className}>
      <div ref={ref} role="img" aria-label={summary} className={cn("relative w-full", thin ? "h-1.5" : "h-7")}>
        {width > 0 &&
          blocks.map(({ i, b, x: left, w, share }) => (
            <div
              key={i}
              tabIndex={0}
              aria-label={`${TERM_NAMES[i]}: ${fmtBps(b)}, ${share}% of the spread`}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className={cn("absolute top-0 flex items-center px-2 text-xs font-semibold outline-none transition-[filter] duration-150", thin ? "h-1.5 rounded-[2px]" : "h-7 rounded-[4px]", hover === i && "brightness-110")}
              style={{ left, width: w, background: TERM_COLORS[i], color: TERM_INK[i] }}
            >
              {!thin && w >= 44 && <span className="tnum">{share}%</span>}
            </div>
          ))}
        {hover !== null && width > 0 && (
          <Tooltip x={(blocks.find((k) => k.i === hover)?.x ?? 0) + (blocks.find((k) => k.i === hover)?.w ?? 0) / 2} y={0}>
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-3 rounded-full" style={{ background: TERM_COLORS[hover] }} />
              <span className="font-semibold text-ink tnum">{fmtBps(bps[hover])}</span>
              <span className="text-muted">{TERM_NAMES[hover]}</span>
            </div>
          </Tooltip>
        )}
      </div>
      {legend && (
        <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
          {TERM_NAMES.map((n, i) => (
            <li key={n} className="t-caption inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px]" style={{ background: TERM_COLORS[i] }} />
              {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TermKey({ i }: { i: number }) {
  return <span aria-hidden className="mr-2 inline-block size-2.5 rounded-[3px] align-middle" style={{ background: TERM_COLORS[i] }} />;
}
