"use client";

import type { LucideIcon } from "lucide-react";
import { motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { type ReactNode, type RefObject, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

/// Shared pieces for the explainer diagrams: an HTML scene of elevated cards,
/// measured so SVG connectors can be drawn between them, chips that travel the
/// connectors, and a phase clock that runs only while the diagram is on screen.
/// Text lives in HTML so it wraps; SVG only draws lines.

export const EASE = [0.22, 1, 0.36, 1] as const;

export type Pt = readonly [number, number];
export type Box = { x: number; y: number; w: number; h: number };
export type Boxes = Record<string, Box>;
export type Tone = "brand" | "buy" | "refuse" | "halt";

/// "still": server render, reduced motion, or before hydration. Everything is
/// visible and at rest. "pre": hydrated but never yet on screen, so the cards
/// wait to make their entrance. "live": entered; the loop runs while on screen.
export type Mode = "still" | "pre" | "live";

const noSubscribe = () => () => {};

export function useMounted() {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}

export function useScene<T extends HTMLElement>(amount = 0.3) {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { amount });
  const seen = useInView(ref, { amount, once: true });
  const reduce = useReducedMotion();
  const mounted = useMounted();
  const animated = mounted && !reduce;
  const mode: Mode = !animated ? "still" : seen ? "live" : "pre";
  return { ref, mode, animated, play: mode === "live" && inView };
}

/// Steps through `durations` (ms) in a loop while `play` is true, after a short
/// lead-in for the entrance. Returns phase -1 when paused, so callers render
/// the rest frame. `cycle` changes every pass and keys one-shot animations.
export function usePhase(play: boolean, durations: readonly number[], lead = 1100) {
  const [state, setState] = useState({ phase: -1, cycle: 0 });
  useEffect(() => {
    if (!play) return;
    let phase = -1;
    let cycle = Math.round(performance.now());
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      phase += 1;
      if (phase >= durations.length) {
        phase = 0;
        cycle += 1;
      }
      setState({ phase, cycle });
      timer = setTimeout(next, durations[phase]);
    };
    timer = setTimeout(next, lead);
    return () => {
      clearTimeout(timer);
      setState((s) => ({ phase: -1, cycle: s.cycle }));
    };
  }, [play, durations, lead]);
  return play ? state : { phase: -1, cycle: state.cycle };
}

/// Measures every `[data-node]` inside `root` relative to it, ignoring
/// transforms (offset geometry), so lifted or tilted cards keep their wires.
/// Updates only on resize, never per frame.
export function useBoxes(root: RefObject<HTMLElement | null>) {
  const [state, setState] = useState<{ w: number; h: number; boxes: Boxes } | null>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let raf = 0;
    const read = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!el.offsetWidth) return setState(null);
        const boxes: Boxes = {};
        el.querySelectorAll<HTMLElement>("[data-node]").forEach((n) => {
          let x = 0;
          let y = 0;
          let cur: HTMLElement | null = n;
          while (cur && cur !== el) {
            x += cur.offsetLeft;
            y += cur.offsetTop;
            cur = cur.offsetParent as HTMLElement | null;
          }
          boxes[n.dataset.node as string] = { x, y, w: n.offsetWidth, h: n.offsetHeight };
        });
        const next = { w: el.offsetWidth, h: el.offsetHeight, boxes };
        setState((prev) => (prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      });
    };
    const ro = new ResizeObserver(read);
    ro.observe(el);
    el.querySelectorAll("[data-node]").forEach((n) => ro.observe(n));
    read();
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [root]);
  return state;
}

// ---------- Geometry ----------

export const mid = (b: Box): Pt => [b.x + b.w / 2, b.y + b.h / 2];
export const right = (b: Box) => b.x + b.w;
export const bottom = (b: Box) => b.y + b.h;

/// SVG path through a polyline with softly rounded corners.
export function roundPath(pts: readonly Pt[], r = 12) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[i + 1];
    const a = Math.min(r, Math.hypot(cx - px, cy - py) / 2);
    const b = Math.min(r, Math.hypot(nx - cx, ny - cy) / 2);
    const ux = Math.sign(cx - px);
    const uy = Math.sign(cy - py);
    const vx = Math.sign(nx - cx);
    const vy = Math.sign(ny - cy);
    d += `L${cx - ux * a},${cy - uy * a}Q${cx},${cy} ${cx + vx * b},${cy + vy * b}`;
  }
  const last = pts[pts.length - 1];
  return `${d}L${last[0]},${last[1]}`;
}

/// Points along a cubic Bezier, for chips that ride a curve.
export function cubicPts(a: Pt, c1: Pt, c2: Pt, b: Pt, n = 32): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return [
      u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0],
      u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1],
    ] as Pt;
  });
}

/// The point a fraction `f` of the way along a polyline, by length.
export function along(pts: readonly Pt[], f: number): Pt {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = lens.reduce((s, l) => s + l, 0);
  let left = Math.max(0, Math.min(1, f)) * total;
  for (let i = 0; i < lens.length; i++) {
    if (left <= lens[i] || i === lens.length - 1) {
      const k = lens[i] ? Math.min(1, left / lens[i]) : 0;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
    }
    left -= lens[i];
  }
  return pts[pts.length - 1];
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function travelKeys(pts: readonly Pt[], n = 28) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= n; i++) {
    const p = along(pts, easeInOut(i / n));
    xs.push(Math.round(p[0] * 10) / 10);
    ys.push(Math.round(p[1] * 10) / 10);
  }
  return { xs, ys, times: xs.map((_, i) => i / n) };
}

/// A small chevron at the end of a path, pointing along its last segment.
export function arrowAt(pts: readonly Pt[]) {
  const [ax, ay] = pts[pts.length - 2];
  const [bx, by] = pts[pts.length - 1];
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  const tx = bx - ux * 2;
  const ty = by - uy * 2;
  const s = 6;
  return `M${tx - ux * s - uy * s * 0.7},${ty - uy * s + ux * s * 0.7}L${tx},${ty}L${tx - ux * s + uy * s * 0.7},${ty - uy * s - ux * s * 0.7}`;
}

// ---------- Stage: gentle depth ----------

/// Tilts its content a few degrees as it scrolls through the viewport and
/// toward the pointer, so the scene reads as an object on the page rather than
/// a flat drawing. Never more than 6 degrees; off when `enabled` is false.
export function Stage({ enabled, children, className = "" }: { enabled: boolean; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 140, damping: 22 });
  const sy = useSpring(py, { stiffness: 140, damping: 22 });
  const on = useMotionValue(0);
  useEffect(() => {
    on.set(enabled ? 1 : 0);
  }, [enabled, on]);
  const rotateX = useTransform(() => on.get() * clamp((0.5 - scrollYProgress.get()) * 9 + sy.get(), -6, 6));
  const rotateY = useTransform(() => on.get() * clamp(sx.get(), -6, 6));
  return (
    <div
      ref={ref}
      className={className}
      style={{ perspective: 1600 }}
      onPointerMove={(e) => {
        if (!enabled || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set(((e.clientX - r.left) / r.width - 0.5) * 5);
        py.set(-((e.clientY - r.top) / r.height - 0.5) * 4);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
    >
      <motion.div style={{ rotateX, rotateY }}>{children}</motion.div>
    </div>
  );
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ---------- Cards ----------

const RING: Record<Tone, string> = {
  brand:
    "ring-brand/55 shadow-[0_0_0_5px_color-mix(in_srgb,var(--color-brand)_13%,transparent),0_22px_44px_-20px_color-mix(in_srgb,var(--color-brand)_60%,transparent)]",
  buy: "bg-buy-soft ring-buy/60 shadow-[0_0_0_5px_color-mix(in_srgb,var(--color-buy)_13%,transparent),0_22px_44px_-20px_color-mix(in_srgb,var(--color-buy)_60%,transparent)]",
  refuse:
    "bg-refuse-soft ring-refuse/60 shadow-[0_0_0_5px_color-mix(in_srgb,var(--color-refuse)_13%,transparent),0_22px_44px_-20px_color-mix(in_srgb,var(--color-refuse)_60%,transparent)]",
  halt: "bg-halt-soft ring-halt/60 shadow-[0_0_0_5px_color-mix(in_srgb,var(--color-halt)_13%,transparent),0_22px_44px_-20px_color-mix(in_srgb,var(--color-halt)_60%,transparent)]",
};

const RIPPLE: Record<Tone, string> = { brand: "ring-brand", buy: "ring-buy", refuse: "ring-refuse", halt: "ring-halt" };

export const CHIP: Record<Tone, string> = {
  brand: "bg-brand/10 text-brand ring-brand/20",
  buy: "bg-buy-soft text-buy ring-buy/25",
  refuse: "bg-refuse-soft text-refuse ring-refuse/25",
  halt: "bg-halt-soft text-halt ring-halt/25",
};

/// An elevated card. It rises in on entrance (`show`, `enterDelay`), lifts and
/// glows while `active`, and sends out a ripple whenever `pulse` changes.
export function CardShell({
  id,
  show = true,
  enterDelay = 0,
  active = false,
  activeDelay = 0,
  tone = "brand",
  pulse,
  className = "",
  children,
}: {
  id: string;
  show?: boolean;
  enterDelay?: number;
  active?: boolean;
  activeDelay?: number;
  tone?: Tone;
  pulse?: string | number;
  className?: string;
  children: ReactNode;
}) {
  const spring = { type: "spring" as const, stiffness: 320, damping: 26, delay: active ? activeDelay : 0 };
  return (
    <motion.div
      data-node={id}
      className={`relative z-10 ${className}`}
      initial={false}
      animate={{ opacity: show ? 1 : 0, y: show ? 0 : 18 }}
      transition={show ? { duration: 0.55, ease: EASE, delay: enterDelay } : { duration: 0 }}
    >
      <motion.div
        className="relative h-full rounded-[10px] bg-surface ring-1 ring-hairline shadow-[0_1px_2px_rgba(40,30,10,0.05),0_12px_28px_-16px_rgba(40,30,10,0.32)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_14px_30px_-14px_rgba(0,0,0,0.8)]"
        initial={false}
        animate={{ y: active ? -4 : 0, scale: active ? 1.02 : 1 }}
        transition={spring}
      >
        <motion.span
          aria-hidden
          className={`pointer-events-none absolute -inset-px rounded-[11px] ring-2 ${RING[tone]}`}
          initial={false}
          animate={{ opacity: active ? 1 : 0 }}
          transition={{ duration: 0.35, delay: active ? activeDelay : 0 }}
        />
        {pulse !== undefined && (
          <motion.span
            key={pulse}
            aria-hidden
            className={`pointer-events-none absolute -inset-px rounded-[11px] ring-2 ${RIPPLE[tone]}`}
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: [0.7, 0], scale: [1, 1.05] }}
            transition={{ duration: 0.9, ease: EASE, delay: activeDelay }}
          />
        )}
        <div className="relative">{children}</div>
      </motion.div>
    </motion.div>
  );
}

/// The standard node: an icon in a tinted chip, a title and a plain line.
export function NodeCard({
  icon: Icon,
  title,
  sub,
  extra,
  tone = "brand",
  ...shell
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  extra?: ReactNode;
} & Omit<Parameters<typeof CardShell>[0], "children">) {
  return (
    <CardShell tone={tone} {...shell}>
      <div className="flex items-start gap-3 p-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ring-1 ring-inset ${CHIP[tone]}`}>
          <Icon size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 pt-px">
          <div className="text-[14px] font-medium leading-snug text-ink">{title}</div>
          <div className="mt-0.5 text-[12.5px] leading-snug text-muted">{sub}</div>
          {extra}
        </div>
      </div>
    </CardShell>
  );
}

// ---------- Wires and travellers ----------

export type Wire = { id: string; d: string; pts: readonly Pt[]; dashed?: boolean; arrow?: boolean };
export type Lit = { key: string; duration: number; delay?: number; tone?: Tone };

const STROKE: Record<Tone, string> = { brand: "stroke-brand", buy: "stroke-buy", refuse: "stroke-refuse", halt: "stroke-halt" };

/// The connectors, drawn in once on entrance. A lit wire carries a bright
/// stroke that runs its length like current, then fades.
export function Wires({ w, h, wires, mode, lit = {} }: { w: number; h: number; wires: Wire[]; mode: Mode; lit?: Record<string, Lit | undefined> }) {
  return (
    <svg width={w} height={h} className="pointer-events-none absolute left-0 top-0 z-0 overflow-visible" aria-hidden>
      {wires.map((wire, i) => {
        const hidden = mode === "pre";
        const enter = hidden ? { duration: 0 } : { duration: 0.7, ease: EASE, delay: 0.35 + i * 0.12 };
        const l = lit[wire.id];
        return (
          <g key={wire.id}>
            {wire.dashed ? (
              <motion.path
                d={wire.d}
                fill="none"
                className="stroke-line-strong"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                strokeLinecap="round"
                initial={false}
                animate={{ opacity: hidden ? 0 : 1 }}
                transition={enter}
              />
            ) : (
              <motion.path
                d={wire.d}
                fill="none"
                className="stroke-line-strong"
                strokeWidth={1.5}
                strokeLinecap="round"
                initial={false}
                animate={{ pathLength: hidden ? 0 : 1, opacity: hidden ? 0 : 1 }}
                transition={enter}
              />
            )}
            {wire.arrow !== false && (
              <motion.path
                d={arrowAt(wire.pts)}
                fill="none"
                className="stroke-faint"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={false}
                animate={{ opacity: hidden ? 0 : 1 }}
                transition={hidden ? { duration: 0 } : { duration: 0.3, delay: 0.8 + i * 0.12 }}
              />
            )}
            {l && (
              <g key={l.key}>
                <motion.path
                  d={wire.d}
                  fill="none"
                  className={STROKE[l.tone ?? "brand"]}
                  strokeWidth={7}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: [0, 0.16, 0.16, 0] }}
                  transition={{ pathLength: { duration: l.duration, ease: "easeInOut", delay: l.delay ?? 0 }, opacity: { duration: l.duration + 1, delay: l.delay ?? 0, times: [0, 0.1, 0.7, 1] } }}
                />
                <motion.path
                  d={wire.d}
                  fill="none"
                  className={STROKE[l.tone ?? "brand"]}
                  strokeWidth={2}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
                  transition={{ pathLength: { duration: l.duration, ease: "easeInOut", delay: l.delay ?? 0 }, opacity: { duration: l.duration + 1, delay: l.delay ?? 0, times: [0, 0.05, 0.7, 1] } }}
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

const DOT: Record<Tone | "ink", string> = { brand: "bg-brand", buy: "bg-buy", refuse: "bg-refuse", halt: "bg-halt", ink: "bg-ink" };

/// Carries `children` along `pts` with an ease in and out, fading in at the
/// start and out at the end, trailed by a short stream of fading particles.
/// Sits under the cards, so it slips behind a card as it arrives.
export function Traveler({ pts, duration, delay = 0, trail = "brand", children }: { pts: readonly Pt[]; duration: number; delay?: number; trail?: Tone | "ink"; children?: ReactNode }) {
  const k = useMemo(() => travelKeys(pts), [pts]);
  const fade = { duration, delay, times: [0, 0.14, 0.86, 1] };
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className={`absolute left-0 top-0 z-[5] -ml-[3px] -mt-[3px] size-1.5 rounded-full ${DOT[trail]}`}
          initial={{ x: k.xs[0], y: k.ys[0], opacity: 0 }}
          animate={{ x: k.xs, y: k.ys, opacity: [0, 0.55 - i * 0.11, 0.55 - i * 0.11, 0] }}
          transition={{ duration, delay: delay + i * 0.055, ease: "linear", times: k.times, opacity: { ...fade, delay: delay + i * 0.055 } }}
        />
      ))}
      <motion.div
        aria-hidden
        className="absolute left-0 top-0 z-[6]"
        initial={{ x: k.xs[0], y: k.ys[0], opacity: 0, scale: 0.85 }}
        animate={{ x: k.xs, y: k.ys, opacity: [0, 1, 1, 0], scale: [0.85, 1, 1, 0.85] }}
        transition={{ duration, delay, ease: "linear", times: k.times, opacity: fade, scale: fade }}
      >
        <div className="-translate-x-1/2 -translate-y-1/2">
          {children ?? <span className={`block size-2.5 rounded-full ring-4 ring-surface ${DOT[trail]}`} />}
        </div>
      </motion.div>
    </>
  );
}

/// A label pinned to a wire, saying what travels there. Coins pass behind it.
export function Resting({
  at,
  show,
  delay = 0,
  active = false,
  anchor = "center",
  children,
}: {
  at: Pt;
  show: boolean;
  delay?: number;
  active?: boolean;
  anchor?: "center" | "left" | "right";
  children: ReactNode;
}) {
  return (
    <motion.div
      aria-hidden
      className="absolute left-0 top-0 z-[7]"
      style={{ x: at[0], y: at[1] }}
      initial={false}
      animate={{ opacity: show ? 1 : 0, scale: !show ? 0.9 : active ? 1.06 : 1 }}
      transition={{ opacity: { duration: show ? 0.4 : 0, delay: show ? delay : 0 }, scale: { type: "spring", stiffness: 400, damping: 22 } }}
    >
      <div className={anchor === "left" ? "-translate-y-1/2" : anchor === "right" ? "-translate-x-full -translate-y-1/2" : "-translate-x-1/2 -translate-y-1/2"}>{children}</div>
    </motion.div>
  );
}

/// A label pill for what travels on a wire: a coin-like icon and a short
/// label. It brightens while its wire is carrying something.
export function Token({ icon: Icon, label, tone = "ink", active = false }: { icon: LucideIcon; label: string; tone?: "ink" | "brand"; active?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface py-[3px] pl-[3px] pr-2.5 text-[11.5px] font-medium leading-4 text-ink shadow-[0_8px_18px_-10px_rgba(40,30,10,0.55)] ring-1 transition-[box-shadow,color] duration-300 dark:shadow-[0_8px_18px_-8px_rgba(0,0,0,0.9)] ${active ? "ring-brand/70" : "ring-line-strong"}`}
    >
      <span className={`grid size-[18px] place-items-center rounded-full text-canvas ${tone === "brand" ? "bg-brand" : "bg-ink"}`}>
        <Icon size={11} strokeWidth={2.25} aria-hidden />
      </span>
      {label}
    </span>
  );
}

/// The thing in motion: a small coin with an icon, ringed in paper so it reads
/// over a wire.
export function Coin({ icon: Icon, tone = "ink" }: { icon: LucideIcon; tone?: "ink" | "brand" }) {
  return (
    <span
      className={`grid size-[22px] place-items-center rounded-full text-canvas ring-[3px] ring-surface shadow-[0_6px_14px_-4px_rgba(40,30,10,0.5)] dark:shadow-[0_6px_14px_-4px_rgba(0,0,0,0.9)] ${tone === "brand" ? "bg-brand" : "bg-ink"}`}
    >
      <Icon size={12} strokeWidth={2.25} aria-hidden />
    </span>
  );
}

/// A small mono note pinned at a measured point. `align` says which edge of
/// the note sits on the point.
export function Note({ at, align = "center", show, children }: { at: Pt; align?: "left" | "right" | "center"; show: boolean; children: ReactNode }) {
  const tx = align === "left" ? "0" : align === "right" ? "-100%" : "-50%";
  return (
    <motion.span
      aria-hidden
      className="absolute z-[7] whitespace-nowrap font-mono text-[10.5px] font-medium uppercase leading-4 tracking-[0.08em] text-muted"
      style={{ left: at[0], top: at[1], translate: `${tx} -50%` }}
      initial={false}
      animate={{ opacity: show ? 1 : 0 }}
      transition={{ duration: show ? 0.4 : 0, delay: show ? 0.9 : 0 }}
    >
      {children}
    </motion.span>
  );
}

// ---------- Story steps ----------

/// The numbered caption under a scene. While playing, the active step is
/// emphasised and its rule fills over the step's duration.
export function Steps({ steps, active, cycle, durations }: { steps: readonly string[]; active: number; cycle: number; durations: readonly number[] }) {
  return (
    <ol className="mt-6 grid gap-x-5 gap-y-2.5 sm:grid-cols-3">
      {steps.map((s, i) => {
        const on = active === i;
        return (
          <li key={s} className="relative pt-3">
            <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 overflow-hidden rounded-full bg-hairline">
              {on && (
                <motion.span
                  key={cycle}
                  className="absolute inset-0 origin-left rounded-full bg-brand"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: durations[i] / 1000, ease: "linear" }}
                />
              )}
            </span>
            <span className={`flex gap-2.5 text-[13.5px] leading-snug transition-colors duration-300 ${active < 0 ? "text-ink-2" : on ? "text-ink" : "text-muted"}`}>
              <span
                className={`num mt-px grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-medium transition-colors duration-300 ${on ? "bg-brand text-canvas" : "bg-sunk text-ink-2"}`}
              >
                {i + 1}
              </span>
              <span>{s}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
