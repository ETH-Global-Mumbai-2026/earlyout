"use client";

import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { COPY, TERM_LABELS } from "@/lib/copy";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { fmtBps } from "@/lib/format";
import { indicativeBid } from "@/lib/pricing";
import type { Fund } from "@/lib/types";

type Params = { baseBps: number; utilBps: number; creditBps: number; volBps: number };
type Terms = { base: number; util: number; time: number; credit: number; total: number };

const DAY = 86400;
const MAX_DAYS = 180;
const HEIGHT = 200;
const PAD = { l: 40, r: 16, t: 22, b: 26 };
const EASE = [0.22, 1, 0.36, 1] as const;

/// The four spread terms for a claim paying out in `days`, from the vault's own
/// quote formula (`indicativeBid`) so the explorer never drifts from the app.
/// The time term is what the formula adds beyond the three flat terms.
function termsAt(days: number, p: Params): Terms {
  const fund: Fund = {
    address: "0x0000000000000000000000000000000000000000",
    symbol: "",
    name: "",
    nav: 0n,
    navUpdatedAt: 0,
    status: 0,
    impaired: false,
    settlementDelay: Math.round(days * DAY),
    window: 0,
    maxAge: 0,
    capUsdc: 0n,
    deployedUsdc: 0n,
    volBps: p.volBps,
    creditBps: p.creditBps,
  };
  const { spreadBps } = indicativeBid(fund, 0, { baseBps: p.baseBps, utilBps: p.utilBps });
  return { base: p.baseBps, util: p.utilBps, time: spreadBps - p.baseBps - p.utilBps - p.creditBps, credit: p.creditBps, total: spreadBps };
}

/// Spread by days to payout. The curve draws in once when first seen; the
/// slider moves a marker whose stacked bar shows the four terms, and the term
/// rows below update live. Reduced motion shows the curve fully drawn.
export function SpreadExplorer({ baseBps, utilBps, creditBps, volBps }: { baseBps: number; utilBps: number; creditBps: number; volBps: number }) {
  const [days, setDays] = useState(90);
  const inputId = useId();
  const gradId = `area${inputId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const wrap = useRef<HTMLDivElement>(null);
  const seen = useInView(wrap, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const curve = useMemo(() => {
    const p = { baseBps, utilBps, creditBps, volBps };
    return Array.from({ length: MAX_DAYS + 1 }, (_, d) => termsAt(d, p).total);
  }, [baseBps, utilBps, creditBps, volBps]);
  const t = termsAt(days, { baseBps, utilBps, creditBps, volBps });

  const w = Math.max(0, width - PAD.l - PAD.r);
  const h = HEIGHT - PAD.t - PAD.b;
  const yMax = Math.max(2, Math.ceil(curve[MAX_DAYS] / 100 + 0.5));
  const yStep = yMax <= 4 ? 1 : 2;
  const yTicks = Array.from({ length: Math.floor(yMax / yStep) + 1 }, (_, i) => i * yStep);
  const sx = (d: number) => PAD.l + (d / MAX_DAYS) * w;
  const sy = (bps: number) => PAD.t + h - (bps / 100 / yMax) * h;

  const line = curve.map((bps, d) => `${d ? "L" : "M"}${sx(d).toFixed(1)},${sy(bps).toFixed(1)}`).join("");
  const area = `${line}L${sx(MAX_DAYS).toFixed(1)},${sy(0)}L${sx(0)},${sy(0)}Z`;

  const mx = sx(days);
  const my = sy(t.total);
  const segs = [
    { v: t.base, cls: "fill-viz-1" },
    { v: t.util, cls: "fill-viz-2" },
    { v: t.time, cls: "fill-viz-3" },
    { v: t.credit, cls: "fill-viz-4" },
  ];
  let acc = 0;
  const bars = segs.map((s) => {
    const from = acc;
    acc += s.v;
    return { ...s, y: sy(acc), height: Math.max(0, sy(from) - sy(acc)) };
  });
  // The curve rises to the right, so the figure sits above and to the left of
  // the marker, clear of the line, except right at the start.
  const labelLeft = mx > PAD.l + 56;

  const drawn = seen || reduce === true;
  const live = useInView(wrap, { amount: 0.2 });
  const mxs = useSpring(mx, GLIDE);
  const mys = useSpring(my, GLIDE);
  useEffect(() => {
    if (reduce || !seen) {
      mxs.jump(mx);
      mys.jump(my);
    } else {
      mxs.set(mx);
      mys.set(my);
    }
  }, [mx, my, reduce, seen, mxs, mys]);
  const labelX = useTransform(mxs, (v) => v + (labelLeft ? -10 : 10));
  const labelY = useTransform(mys, (v) => v - 12);
  const chartLabel = `Total discount by days until payout, from ${fmtBps(curve[0])} for a claim due now to ${fmtBps(curve[MAX_DAYS])} at ${MAX_DAYS} days. At ${days} days it is ${fmtBps(t.total)}.`;

  const rows = [
    { label: TERM_LABELS[0], v: t.base, swatch: "bg-viz-1" },
    { label: TERM_LABELS[1], v: t.util, swatch: "bg-viz-2" },
    { label: TERM_LABELS[2], v: t.time, swatch: "bg-viz-3", testId: "explorer-time" },
    { label: TERM_LABELS[3], v: t.credit, swatch: "bg-viz-4" },
  ];

  return (
    <div className="text-left">
      <div ref={wrap} className="relative w-full" style={{ height: HEIGHT }}>
        {width > 0 && (
          <svg width={width} height={HEIGHT} role="img" aria-label={chartLabel} className="block overflow-visible">
            {yTicks.map((tick) => (
              <g key={tick}>
                <line x1={PAD.l} x2={PAD.l + w} y1={sy(tick * 100)} y2={sy(tick * 100)} className="stroke-hairline" />
                <text x={PAD.l - 8} y={sy(tick * 100)} dy="0.32em" textAnchor="end" className="num fill-muted font-mono text-[11px]">
                  {tick}%
                </text>
              </g>
            ))}
            {[0, 30, 60, 90, 120, 150, 180].map((d) => (
              <text key={d} x={sx(d)} y={HEIGHT - 6} textAnchor="middle" className="num fill-muted font-mono text-[11px]">
                {d === 0 ? "now" : `${d}d`}
              </text>
            ))}
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: "var(--color-brand)", stopOpacity: 0.16 }} />
                <stop offset="1" style={{ stopColor: "var(--color-brand)", stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            <motion.path
              d={area}
              fill={`url(#${gradId})`}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: drawn ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : 0.6 }}
            />
            <motion.path
              d={line}
              fill="none"
              className="stroke-ink"
              strokeWidth={1.75}
              strokeLinejoin="round"
              strokeLinecap="round"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: drawn ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.9, ease: EASE }}
            />
            <motion.line x1={mxs} x2={mxs} y1={PAD.t} y2={PAD.t + h} className="stroke-faint" strokeDasharray="3 3" />
            {bars.map((b) => (
              <motion.rect
                key={b.cls}
                x={mxs}
                width={6}
                className={b.cls}
                style={{ translateX: -3 }}
                initial={false}
                animate={{ attrY: b.y, height: b.height }}
                transition={reduce ? { duration: 0 } : { type: "spring", ...GLIDE }}
              />
            ))}
            {live && !reduce && drawn && (
              <motion.circle
                cx={mxs}
                cy={mys}
                r={10}
                className="fill-ink"
                initial={{ opacity: 0.18, scale: 0.4 }}
                animate={{ opacity: 0, scale: 1.4 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
              />
            )}
            <motion.circle cx={mxs} cy={mys} r={4.5} className="fill-ink stroke-surface" strokeWidth={2} />
            <motion.text
              x={labelX}
              y={labelY}
              textAnchor={labelLeft ? "end" : "start"}
              className="num fill-ink stroke-surface font-mono text-[11px] font-medium"
              strokeWidth={4}
              strokeLinejoin="round"
              style={{ paintOrder: "stroke" }}
            >
              {fmtBps(t.total)}
            </motion.text>
          </svg>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={inputId} className="t-label">
            Days to payout
          </label>
          <span className="num text-[13px] text-ink">
            {days} {days === 1 ? "day" : "days"}
          </span>
        </div>
        <div className="mt-2 rounded-[3px] has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-brand has-[input:focus-visible]:ring-offset-2 has-[input:focus-visible]:ring-offset-canvas">
          <input
            id={inputId}
            type="range"
            min={1}
            max={MAX_DAYS}
            step={1}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            // Also on raw input events: a value set programmatically and then
            // dispatched (as some test tools do) skips React's change tracking.
            onInput={(e) => setDays(Number(e.currentTarget.value))}
            aria-valuetext={`${days} ${days === 1 ? "day" : "days"}`}
            className="block w-full accent-ink"
          />
        </div>
      </div>

      <TermBar parts={segs} reduce={reduce} />

      <dl className="mt-3 text-[14px]">
        {rows.map((r) => (
          <div key={r.label} className="rule-dashed flex items-baseline justify-between gap-3 py-2">
            <dt className="flex items-center gap-2 text-ink-2">
              <span aria-hidden className={`size-2 shrink-0 rounded-[2px] ${r.swatch}`} />
              {r.label}
            </dt>
            <dd className="num text-ink" data-testid={r.testId}>
              <Tween value={r.v} reduce={reduce} />
            </dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-3 pt-2.5">
          <dt className="font-medium text-ink">{COPY.terms.total}</dt>
          <dd className="num font-medium text-ink">
            <Tween value={t.total} reduce={reduce} />
          </dd>
        </div>
      </dl>
    </div>
  );
}

const GLIDE = { stiffness: 260, damping: 30, mass: 0.6 };

/// A figure that tweens to each new value instead of jumping. Server render
/// and reduced motion show the value as is.
function Tween({ value, reduce }: { value: number; reduce: boolean | null }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => fmtBps(v));
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { duration: 0.35, ease: EASE });
    return () => c.stop();
  }, [value, reduce, mv]);
  return <motion.span>{text}</motion.span>;
}

/// The four terms side by side as one bar, each segment gliding to its new
/// share of the total.
function TermBar({ parts, reduce }: { parts: { v: number; cls: string }[]; reduce: boolean | null }) {
  const vals = parts.map((p) => Math.max(0, p.v));
  const total = vals.reduce((s, v) => s + v, 0) || 1;
  const starts = vals.map((_, i) => vals.slice(0, i).reduce((s, v) => s + v, 0));
  return (
    <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="mt-4 block h-2.5 w-full overflow-hidden rounded-full bg-viz-track" aria-hidden>
      {parts.map((p, i) => {
        const x = (starts[i] / total) * 100;
        const w = (vals[i] / total) * 100;
        return (
          <motion.rect
            key={p.cls}
            y={0}
            height={10}
            className={p.cls}
            initial={false}
            animate={{ attrX: x, width: w }}
            transition={reduce ? { duration: 0 } : { type: "spring", ...GLIDE }}
          />
        );
      })}
    </svg>
  );
}
