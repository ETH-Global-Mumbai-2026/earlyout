"use client";

import { ArrowLeftRight, Banknote, CircleDollarSign, Coins, Landmark, type LucideIcon, Ticket, UserRound } from "lucide-react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import {
  type Boxes,
  Coin,
  EASE,
  NodeCard,
  Note,
  type Pt,
  Resting,
  Stage,
  Steps,
  Token,
  Traveler,
  type Wire,
  Wires,
  bottom,
  cubicPts,
  right,
  roundPath,
  useBoxes,
  usePhase,
  useScene,
} from "./Scene";

const LABEL =
  "How a sale works. You send your fund tokens to Earlyout, which takes your place in the fund's payout line and hands it to the cash pool. The cash pool pays you USDC straight away. On payout day, the fund pays the pool in full.";

const STEPS = ["You send your fund tokens", "The pool pays you USDC straight away", "On payout day the fund pays the pool"] as const;

const PAID = 1047.17;

// One pass of the story. Each phase names the step it belongs to, the card in
// focus and the wire whose chip is moving.
const PHASES = [
  { ms: 1500, step: 0, focus: "you", wire: "tokens" },
  { ms: 1400, step: 0, focus: "earlyout", wire: "place" },
  { ms: 1700, step: 1, focus: "pool", wire: "usdc" },
  { ms: 1600, step: 1, focus: "you", wire: undefined },
  { ms: 1700, step: 2, focus: "fund", wire: "payout" },
  { ms: 1600, step: 2, focus: "pool", wire: undefined },
] as const;
const DURATIONS = PHASES.map((p) => p.ms);
const STEP_MS = [0, 1, 2].map((s) => PHASES.filter((p) => p.step === s).reduce((t, p) => t + p.ms, 0));

type WireId = "tokens" | "place" | "usdc" | "payout";

const CHIPS: Record<WireId, { icon: LucideIcon; label: string; tone: "ink" | "brand" }> = {
  tokens: { icon: Coins, label: "Fund tokens", tone: "ink" },
  place: { icon: Ticket, label: "Place in line", tone: "ink" },
  usdc: { icon: CircleDollarSign, label: "$1,047 USDC", tone: "brand" },
  payout: { icon: CircleDollarSign, label: "Full payout", tone: "brand" },
};
const WIRE_IDS = Object.keys(CHIPS) as WireId[];

type Geo = { wires: Wire[]; labels: Record<WireId, { at: Pt; anchor: "center" | "left" }>; note: { at: Pt; align: "right" } };

/// Wires between the measured cards. Wide screens read left to right with the
/// USDC arcing back over the top; narrow screens stack the cards and run two
/// rails, fund tokens down the left and USDC up the right.
function geometry(b: Boxes): Geo | null {
  const { you, earlyout, pool, fund } = b;
  if (!you || !earlyout || !pool || !fund) return null;
  const wide = Math.abs(earlyout.y - you.y) < 4;
  if (wide) {
    const y = you.y + you.h / 2;
    const tokens: Pt[] = [
      [right(you), y],
      [earlyout.x, y],
    ];
    const place: Pt[] = [
      [right(earlyout), y],
      [pool.x, y],
    ];
    const s: Pt = [pool.x + pool.w * 0.42, pool.y];
    const e: Pt = [you.x + you.w * 0.58, you.y];
    const k = (s[1] - 48) / 0.75;
    const c1: Pt = [s[0], s[1] - k];
    const c2: Pt = [e[0], e[1] - k];
    const usdc = cubicPts(s, c1, c2, e);
    const x = pool.x + pool.w * 0.4;
    const payout: Pt[] = [
      [x, fund.y],
      [x, bottom(pool)],
    ];
    const gapMid = (fund.y + bottom(pool)) / 2;
    return {
      wires: [
        { id: "tokens", d: roundPath(tokens), pts: tokens },
        { id: "place", d: roundPath(place), pts: place },
        { id: "usdc", d: `M${s[0]},${s[1]}C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${e[0]},${e[1]}`, pts: usdc },
        { id: "payout", d: roundPath(payout), pts: payout, dashed: true },
      ],
      labels: {
        tokens: { at: [(right(you) + earlyout.x) / 2, y - 22], anchor: "center" },
        place: { at: [(right(earlyout) + pool.x) / 2, y - 22], anchor: "center" },
        usdc: { at: [usdc[16][0], usdc[16][1] - 26], anchor: "center" },
        payout: { at: [x + 16, gapMid], anchor: "left" },
      },
      note: { at: [x - 16, gapMid], align: "right" },
    };
  }
  const l = you.x + you.w * 0.3;
  const r = you.x + you.w * 0.7;
  const tokens: Pt[] = [
    [l, bottom(you)],
    [l, earlyout.y],
  ];
  const place: Pt[] = [
    [l, bottom(earlyout)],
    [l, pool.y],
  ];
  const usdc: Pt[] = [
    [r, pool.y],
    [r, bottom(you)],
  ];
  const payout: Pt[] = [
    [r, fund.y],
    [r, bottom(pool)],
  ];
  const g1 = (bottom(you) + earlyout.y) / 2;
  const g2 = (bottom(earlyout) + pool.y) / 2;
  const g3 = (bottom(pool) + fund.y) / 2;
  return {
    wires: [
      { id: "tokens", d: roundPath(tokens), pts: tokens },
      { id: "place", d: roundPath(place), pts: place },
      { id: "usdc", d: roundPath(usdc), pts: usdc },
      { id: "payout", d: roundPath(payout), pts: payout, dashed: true },
    ],
    labels: {
      tokens: { at: [l, g1], anchor: "center" },
      place: { at: [l, g2], anchor: "center" },
      usdc: { at: [r, g1], anchor: "center" },
      payout: { at: [r, g3], anchor: "center" },
    },
    note: { at: [r - 62, g3], align: "right" },
  };
}

/// How a sale works, told as a short scene: your fund tokens travel to
/// Earlyout and on to the cash pool, USDC comes straight back to you and your
/// balance ticks up, then on payout day the fund pays the pool. Loops only
/// while on screen. Reduced motion, the server render and off screen show the
/// still frame: every card, every wire and each chip resting on its wire.
export function SaleFlow() {
  const { ref, mode, play, animated } = useScene<HTMLElement>();
  const root = useRef<HTMLDivElement>(null);
  const m = useBoxes(root);
  const geo = m ? geometry(m.boxes) : null;
  const { phase, cycle } = usePhase(play, DURATIONS);
  const cur = phase >= 0 ? PHASES[phase] : undefined;
  const show = mode !== "pre";
  const focus = cur?.focus;
  const paid = !cur || phase >= 3;

  const lit = cur?.wire ? { [cur.wire]: { key: `${cycle}-${phase}`, duration: (cur.ms / 1000) * 0.8 } } : {};

  return (
    <figure ref={ref} className="text-left">
      <Stage enabled={animated}>
        <div role="img" aria-label={LABEL}>
          <div ref={root} className="relative mx-auto max-w-md lg:max-w-none lg:pt-[84px]">
            {m && geo && <Wires wires={geo.wires} w={m.w} h={m.h} mode={mode} lit={lit} />}
            <div className="grid grid-cols-1 gap-y-[72px] lg:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)_140px_minmax(0,1fr)] lg:grid-rows-[auto_84px_auto] lg:gap-y-0">
              <NodeCard
                id="you"
                icon={UserRound}
                title="You"
                sub="Waiting for a payout"
                show={show}
                enterDelay={0}
                active={focus === "you"}
                pulse={phase === 3 ? cycle : undefined}
                className="lg:col-start-1 lg:row-start-1"
                extra={<Received paid={paid} run={phase === 3 ? cycle : undefined} />}
              />
              <NodeCard
                id="earlyout"
                icon={ArrowLeftRight}
                title="Earlyout"
                sub="Takes your place in line"
                show={show}
                enterDelay={0.1}
                active={focus === "earlyout"}
                pulse={phase === 1 ? cycle : undefined}
                className="lg:col-start-3 lg:row-start-1"
              />
              <NodeCard
                id="pool"
                icon={Banknote}
                title="Cash pool"
                sub="Pays you now"
                show={show}
                enterDelay={0.2}
                active={focus === "pool"}
                pulse={phase === 2 || phase === 5 ? `${cycle}-${phase}` : undefined}
                className="lg:col-start-5 lg:row-start-1"
              />
              <NodeCard
                id="fund"
                icon={Landmark}
                title="The fund"
                sub="Pays later, in full"
                show={show}
                enterDelay={0.3}
                active={focus === "fund"}
                className="lg:col-start-5 lg:row-start-3"
              />
            </div>
            {geo && (
              <>
                {WIRE_IDS.map((k) => (
                  <Resting key={k} at={geo.labels[k].at} anchor={geo.labels[k].anchor} show={show} delay={0.9} active={cur?.wire === k}>
                    <Token {...CHIPS[k]} active={cur?.wire === k} />
                  </Resting>
                ))}
                {cur?.wire && (
                  <Traveler
                    key={`${cycle}-${phase}`}
                    pts={geo.wires.find((w) => w.id === cur.wire)!.pts}
                    duration={(cur.ms / 1000) * 0.82}
                    trail={CHIPS[cur.wire].tone}
                  >
                    <Coin icon={CHIPS[cur.wire].icon} tone={CHIPS[cur.wire].tone} />
                  </Traveler>
                )}
                <Note at={geo.note.at} align={geo.note.align} show={show}>
                  On payout day
                </Note>
              </>
            )}
          </div>
        </div>
      </Stage>
      <figcaption>
        <Steps steps={STEPS} active={cur ? cur.step : -1} cycle={cycle} durations={STEP_MS} />
      </figcaption>
    </figure>
  );
}

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/// The holder's balance line: counts up to the amount paid when the USDC lands.
function Received({ paid, run }: { paid: boolean; run?: number }) {
  const value = useMotionValue(PAID);
  const text = useTransform(value, (v) => (v > 0 ? `+${usd(v)}` : usd(0)));
  useEffect(() => {
    if (!paid) {
      value.set(0);
      return;
    }
    if (run === undefined) {
      value.set(PAID);
      return;
    }
    const c = animate(value, PAID, { from: 0, duration: 1, ease: EASE });
    return () => c.stop();
  }, [paid, run, value]);
  return (
    <div className="mt-2 flex items-baseline gap-1.5">
      <motion.span className={`num font-mono text-[13px] font-medium transition-colors duration-300 ${paid ? "text-brand" : "text-faint"}`}>{text}</motion.span>
      <span className="text-[12px] text-muted">USDC received</span>
    </div>
  );
}
