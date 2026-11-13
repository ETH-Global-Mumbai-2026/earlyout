"use client";

import { Activity, Check, Inbox, type LucideIcon, Vault, X } from "lucide-react";
import { motion } from "motion/react";
import { useRef } from "react";
import { type Boxes, CHIP, CardShell, EASE, type Lit, type Pt, Stage, type Tone, Traveler, type Wire, Wires, bottom, right, roundPath, useBoxes, usePhase, useScene } from "./Scene";

type Verdict = "BUY" | "REFUSE" | "HALT";
type WireId = "q" | "yes1" | "yes2" | "no1" | "no2";

const HALT_CONDS = ["Price out of date", "Fund reports a problem", "Fund marked down"];
const REFUSE_CONDS = ["Fund limit reached", "Pool short of cash", "Payout already due"];

const BUY_TEXT = "BUY: the fund is healthy and the pool has room. You get paid the price shown, straight away.";

// One pass through every condition, BUY then REFUSE then HALT each time.
const STEPS: { v: Verdict; cond?: string; text: string }[] = [
  { v: "BUY", text: BUY_TEXT },
  { v: "REFUSE", cond: "Fund limit reached", text: "REFUSE: the pool already holds as much of this fund as it allows. Nothing is sent. Try a smaller amount." },
  { v: "HALT", cond: "Price out of date", text: "HALT: the fund's price has not updated for too long. Selling pauses until a fresh price arrives." },
  { v: "BUY", text: BUY_TEXT },
  { v: "REFUSE", cond: "Pool short of cash", text: "REFUSE: the pool does not have enough spare cash for this sale right now. Try a smaller amount." },
  { v: "HALT", cond: "Fund reports a problem", text: "HALT: the fund has reported a problem. Selling stops straight away." },
  { v: "BUY", text: BUY_TEXT },
  { v: "REFUSE", cond: "Payout already due", text: "REFUSE: this payout is already due, so there is nothing to sell early." },
  { v: "HALT", cond: "Fund marked down", text: "HALT: the fund's payouts have been marked down. Selling stays paused until it recovers." },
];
const STEP_MS = 4200;
const DURATIONS = STEPS.map(() => STEP_MS);

const STILL_TEXT = "Two checks, three answers. BUY: you can sell now. REFUSE: not this amount, nothing is sent. HALT: selling is paused for everyone.";

const LABEL =
  "How every sale is checked. First: is the fund's price up to date and the fund healthy? If not, HALT. Second: is there room for this sale? If not, REFUSE. If both pass, BUY: you get paid now.";

// The route each verdict takes, and the card it reaches after each wire.
const PATH: Record<Verdict, { wire: WireId; to: string }[]> = {
  BUY: [
    { wire: "q", to: "c1" },
    { wire: "yes1", to: "c2" },
    { wire: "yes2", to: "buy" },
  ],
  REFUSE: [
    { wire: "q", to: "c1" },
    { wire: "yes1", to: "c2" },
    { wire: "no2", to: "refuse" },
  ],
  HALT: [
    { wire: "q", to: "c1" },
    { wire: "no1", to: "halt" },
  ],
};
const HOP = 0.62; // seconds per wire
const TONE: Record<Verdict, Tone> = { BUY: "buy", REFUSE: "refuse", HALT: "halt" };

type Geo = { wires: Wire[]; tags: { text: string; at: Pt; anchor: "center" | "left" }[] };

/// Wide screens: the checks run left to right with the No branches dropping
/// below. Narrow screens: one column down a spine on the left, each No branch
/// stepping right into an indented verdict card.
function geometry(b: Boxes): Geo | null {
  const { quote, c1, c2, buy, halt, refuse } = b;
  if (!quote || !c1 || !c2 || !buy || !halt || !refuse) return null;
  const wide = Math.abs(c2.y - c1.y) < 4;
  if (wide) {
    const y = c1.y + c1.h / 2;
    const x1 = c1.x + c1.w / 2;
    const x2 = c2.x + c2.w / 2;
    const seg = (a: Pt, z: Pt): Pt[] => [a, z];
    const wires: [WireId, Pt[]][] = [
      ["q", seg([right(quote), y], [c1.x, y])],
      ["yes1", seg([right(c1), y], [c2.x, y])],
      ["yes2", seg([right(c2), y], [buy.x, y])],
      ["no1", seg([x1, bottom(c1)], [x1, halt.y])],
      ["no2", seg([x2, bottom(c2)], [x2, refuse.y])],
    ];
    const gy = (bottom(c1) + halt.y) / 2;
    return {
      wires: wires.map(([id, pts]) => ({ id, pts, d: roundPath(pts) })),
      tags: [
        { text: "Yes", at: [(right(c1) + c2.x) / 2, y - 14], anchor: "center" },
        { text: "Yes", at: [(right(c2) + buy.x) / 2, y - 14], anchor: "center" },
        { text: "No", at: [x1 + 10, gy], anchor: "left" },
        { text: "No", at: [x2 + 10, gy], anchor: "left" },
      ],
    };
  }
  const x = quote.x + 18;
  const hy = halt.y + 30;
  const ry = refuse.y + 30;
  const wires: [WireId, Pt[]][] = [
    [
      "q",
      [
        [x, bottom(quote)],
        [x, c1.y],
      ],
    ],
    [
      "yes1",
      [
        [x, bottom(c1)],
        [x, c2.y],
      ],
    ],
    [
      "yes2",
      [
        [x, bottom(c2)],
        [x, buy.y],
      ],
    ],
    [
      "no1",
      [
        [x, bottom(c1)],
        [x, hy],
        [halt.x, hy],
      ],
    ],
    [
      "no2",
      [
        [x, bottom(c2)],
        [x, ry],
        [refuse.x, ry],
      ],
    ],
  ];
  return {
    wires: wires.map(([id, pts]) => ({ id, pts, d: roundPath(pts, 10) })),
    tags: [
      { text: "No", at: [(x + halt.x) / 2 + 2, hy - 11], anchor: "center" },
      { text: "No", at: [(x + refuse.x) / 2 + 2, ry - 11], anchor: "center" },
      { text: "Yes", at: [x + 9, (bottom(halt) + c2.y) / 2], anchor: "left" },
      { text: "Yes", at: [x + 9, (bottom(refuse) + buy.y) / 2], anchor: "left" },
    ],
  };
}

/// The contract's decision as a tree: two checks, three verdicts. While on
/// screen a pulse runs down the route a sale takes, each check lights and
/// answers Yes or No, and the verdict stamp presses in, cycling BUY, REFUSE,
/// HALT through every condition. Reduced motion and off screen show the whole
/// tree at rest. Verdicts are always written as words.
export function VerdictTree() {
  const { ref, mode, play, animated } = useScene<HTMLElement>();
  const root = useRef<HTMLDivElement>(null);
  const m = useBoxes(root);
  const geo = m ? geometry(m.boxes) : null;
  const { phase, cycle } = usePhase(play, DURATIONS, 900);
  const active = phase >= 0 ? STEPS[phase] : undefined;
  const route = active ? PATH[active.v] : [];
  const tone = active ? TONE[active.v] : "brand";
  const key = `${cycle}-${phase}`;
  const show = mode !== "pre";

  // When the pulse reaches each card, in seconds from the start of the step.
  const at = (id: string) => {
    if (!active) return undefined;
    if (id === "quote") return 0;
    const i = route.findIndex((r) => r.to === id);
    return i < 0 ? undefined : (i + 1) * HOP;
  };
  const lit: Record<string, Lit> = {};
  route.forEach((r, i) => {
    const last = i === route.length - 1;
    lit[r.wire] = { key, duration: HOP * 0.9, delay: i * HOP, tone: last ? tone : "brand" };
  });
  // Each check's answer for this sale.
  const answer = (id: "c1" | "c2"): boolean | undefined => {
    if (!active || at(id) === undefined) return undefined;
    if (id === "c1") return active.v !== "HALT";
    return active.v === "BUY";
  };

  const card = { show };
  return (
    <figure ref={ref} className="text-left">
      <Stage enabled={animated}>
        <div role="img" aria-label={LABEL}>
          <div ref={root} className="relative">
            {m && geo && <Wires wires={geo.wires} w={m.w} h={m.h} mode={mode} lit={lit} />}
            <div className="grid grid-cols-1 gap-y-9 lg:grid-cols-[minmax(0,0.8fr)_64px_minmax(0,1fr)_64px_minmax(0,1fr)_64px_minmax(0,0.85fr)] lg:grid-rows-[auto_72px_auto] lg:gap-y-0">
              <Question id="quote" icon={Inbox} title="Your sale" sub="Fund and amount" {...card} delay={0} litAt={at("quote")} className="lg:col-start-1 lg:row-start-1" />
              <Question
                id="c1"
                icon={Activity}
                title="Is the fund healthy?"
                sub="Price up to date, no problems"
                {...card}
                delay={0.08}
                litAt={at("c1")}
                answer={answer("c1")}
                noTone="halt"
                runKey={key}
                className="lg:col-start-3 lg:row-start-1"
              />
              <Leaf id="halt" v="HALT" sub="Paused for everyone" conds={HALT_CONDS} {...card} delay={0.3} active={active} litAt={at("halt")} runKey={key} className="ml-14 lg:col-start-3 lg:row-start-3 lg:ml-0" />
              <Question
                id="c2"
                icon={Vault}
                title="Is there room?"
                sub="Pool has cash and space"
                {...card}
                delay={0.16}
                litAt={at("c2")}
                answer={answer("c2")}
                noTone="refuse"
                runKey={key}
                className="lg:col-start-5 lg:row-start-1"
              />
              <Leaf id="refuse" v="REFUSE" sub="Nothing is sent" conds={REFUSE_CONDS} {...card} delay={0.36} active={active} litAt={at("refuse")} runKey={key} className="ml-14 lg:col-start-5 lg:row-start-3 lg:ml-0" />
              <Leaf id="buy" v="BUY" sub="You get paid now" conds={[]} {...card} delay={0.24} active={active} litAt={at("buy")} runKey={key} className="lg:col-start-7 lg:row-start-1" />
            </div>
            {geo?.tags.map((t, i) => (
              <motion.span
                key={i}
                aria-hidden
                className="absolute z-[7] font-mono text-[10.5px] font-medium uppercase leading-4 tracking-[0.08em] text-muted"
                style={{ left: t.at[0], top: t.at[1], translate: `${t.anchor === "center" ? "-50%" : "0"} -50%` }}
                initial={false}
                animate={{ opacity: show ? 1 : 0 }}
                transition={{ duration: show ? 0.4 : 0, delay: show ? 0.9 : 0 }}
              >
                {t.text}
              </motion.span>
            ))}
            {geo &&
              route.map((r, i) => (
                <Traveler
                  key={`${key}-${r.wire}`}
                  pts={geo.wires.find((w) => w.id === r.wire)!.pts}
                  duration={HOP * 0.9}
                  delay={i * HOP}
                  trail={i === route.length - 1 ? tone : "brand"}
                />
              ))}
          </div>
        </div>
      </Stage>
      <figcaption className="mt-5 grid text-[13.5px] leading-relaxed text-ink-2">
        {/* Every caption sits in the same cell, so the box keeps the height of
            the longest and nothing below shifts as they change. */}
        {[STILL_TEXT, ...STEPS.map((s) => s.text)].map((text, i) => {
          const on = active ? i - 1 === phase : i === 0;
          return (
            <motion.p
              key={i}
              className={`[grid-area:1/1] ${on ? "" : "invisible"}`}
              aria-hidden={!on}
              initial={false}
              animate={{ opacity: on ? 1 : 0, y: on ? 0 : 4 }}
              transition={{ duration: on ? 0.4 : 0.15, ease: EASE, delay: on && active ? 0.15 : 0 }}
            >
              <Captioned text={text} />
            </motion.p>
          );
        })}
      </figcaption>
    </figure>
  );
}

/// Bolds the verdict word that leads a caption, in its own colour.
function Captioned({ text }: { text: string }) {
  const m = text.match(/^(BUY|REFUSE|HALT):\s(.*)$/);
  if (!m) return <>{text}</>;
  const cls = m[1] === "BUY" ? "text-buy" : m[1] === "REFUSE" ? "text-refuse" : "text-halt";
  return (
    <>
      <span className={`font-mono text-[12.5px] font-semibold tracking-[0.06em] ${cls}`}>{m[1]}</span>: {m[2]}
    </>
  );
}

type CardProps = { id: string; show: boolean; delay: number; litAt?: number; runKey?: string; className?: string };

function Question({
  icon: Icon,
  title,
  sub,
  answer,
  noTone = "halt",
  ...p
}: CardProps & { icon: LucideIcon; title: string; sub: string; answer?: boolean; noTone?: Tone }) {
  const lit = p.litAt !== undefined;
  const bad = answer === false;
  return (
    <CardShell id={p.id} show={p.show} enterDelay={p.delay} active={lit} activeDelay={p.litAt ?? 0} pulse={lit ? p.runKey : undefined} className={p.className}>
      <div className="flex items-start gap-3 p-3 pr-5">
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ring-1 ring-inset ${CHIP.brand}`}>
          <Icon size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 pt-px">
          <div className="text-[14px] font-medium leading-snug text-ink">{title}</div>
          <div className="mt-0.5 text-[12.5px] leading-snug text-muted">{sub}</div>
        </div>
      </div>
      {answer !== undefined && (
        <motion.span
          key={p.runKey}
          aria-hidden
          className={`absolute -right-2 -top-2 grid size-6 place-items-center rounded-full text-canvas ring-[3px] ring-surface ${bad ? (noTone === "refuse" ? "bg-refuse" : "bg-halt") : "bg-buy"}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 18, delay: (p.litAt ?? 0) + 0.18 }}
        >
          {bad ? <X size={13} strokeWidth={3} /> : <Check size={13} strokeWidth={3} />}
        </motion.span>
      )}
    </CardShell>
  );
}

function Leaf({ v, sub, conds, active, ...p }: CardProps & { v: Verdict; sub: string; conds: string[]; active?: { v: Verdict; cond?: string } }) {
  const tone = TONE[v];
  const on = p.litAt !== undefined;
  const text = v === "BUY" ? "text-buy" : v === "REFUSE" ? "text-refuse" : "text-halt";
  const bar = v === "BUY" ? "bg-buy" : v === "REFUSE" ? "bg-refuse" : "bg-halt";
  return (
    <CardShell id={p.id} show={p.show} enterDelay={p.delay} tone={tone} active={on} activeDelay={p.litAt ?? 0} pulse={on ? p.runKey : undefined} className={p.className}>
      <div className="p-3">
        <motion.span
          className={`relative inline-block px-1.5 font-mono text-[13px] font-semibold leading-6 tracking-[0.08em] ${text}`}
          initial={false}
          animate={on ? { rotate: -4, scale: [1.35, 1] } : { rotate: 0, scale: 1 }}
          transition={on ? { type: "spring", stiffness: 480, damping: 18, delay: p.litAt } : { duration: 0.25 }}
        >
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-[4px] border-2 border-current"
            initial={false}
            animate={on ? { opacity: [0, 1], scale: [1.6, 1] } : { opacity: 0, scale: 1 }}
            transition={on ? { duration: 0.32, ease: EASE, delay: p.litAt } : { duration: 0.2 }}
          />
          {v}
        </motion.span>
        <div className="mt-1 text-[12.5px] leading-snug text-muted">{sub}</div>
        {conds.length > 0 && (
          <ul className="mt-2.5 grid gap-1">
            {conds.map((c) => {
              const hit = on && active?.cond === c;
              return (
                <li key={c} className={`relative pl-3 text-[13px] leading-snug transition-colors duration-300 ${hit ? "font-medium text-ink" : active ? "text-muted" : "text-ink-2"}`}>
                  <span aria-hidden className={`absolute left-0 top-[3px] h-[14px] w-[3px] rounded-full transition-colors duration-300 ${hit ? bar : "bg-hairline"}`} />
                  {c}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </CardShell>
  );
}
