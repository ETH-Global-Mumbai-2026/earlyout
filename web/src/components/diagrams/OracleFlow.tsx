"use client";

import { Activity, BadgeCheck, BookOpen, FileCheck2, type LucideIcon, Radio, Receipt, Scale, Tag, Workflow, Gauge } from "lucide-react";
import { useRef } from "react";
import { type Boxes, Coin, NodeCard, type Pt, Resting, Stage, Steps, Token, Traveler, type Wire, Wires, bottom, right, roundPath, useBoxes, usePhase, useScene } from "./Scene";

const LABEL =
  "Where the price comes from. A Chainlink price feed on Ethereum and the issuer's status reach a Chainlink CRE workflow, which signs one report and sends it to NavOracle on Arc. The vault prices every sale from NavOracle, and each sale is written to Arkiv, the public book.";

const STEPS = [
  "Chainlink reads the fund price on Ethereum, and the issuer reports its status",
  "The CRE workflow signs one report and sends it to NavOracle on Arc",
  "The vault prices each sale, and each sale is written to Arkiv, the public book",
] as const;

type WireId = "nav" | "status" | "report" | "price" | "sale";

const PHASES: { ms: number; step: number; focus: string[]; wires: WireId[] }[] = [
  { ms: 1600, step: 0, focus: ["feed", "issuer"], wires: ["nav", "status"] },
  { ms: 1400, step: 1, focus: ["cre"], wires: ["report"] },
  { ms: 1400, step: 1, focus: ["oracle"], wires: ["price"] },
  { ms: 1500, step: 2, focus: ["vault"], wires: ["sale"] },
  { ms: 1500, step: 2, focus: ["arkiv"], wires: [] },
];
const DURATIONS = PHASES.map((p) => p.ms);
const STEP_MS = [0, 1, 2].map((s) => PHASES.filter((p) => p.step === s).reduce((t, p) => t + p.ms, 0));

const CHIPS: Record<WireId, { icon: LucideIcon; label: string; tone: "ink" | "brand" }> = {
  nav: { icon: Activity, label: "Fund price", tone: "ink" },
  status: { icon: BadgeCheck, label: "Status OK", tone: "ink" },
  report: { icon: FileCheck2, label: "Report", tone: "brand" },
  price: { icon: Tag, label: "Price", tone: "brand" },
  sale: { icon: Receipt, label: "Each sale", tone: "ink" },
};
const WIRE_IDS = Object.keys(CHIPS) as WireId[];

type Geo = { wires: Wire[]; labels: Record<WireId, { at: Pt; anchor: "center" | "left" | "right" }> };

/// Wide screens: the price runs left to right along the top row, the issuer
/// status joins the CRE workflow from below, and Arkiv hangs under the vault.
/// Narrow screens: the two inputs side by side, then one column down.
function geometry(b: Boxes): Geo | null {
  const { feed, issuer, cre, oracle, vault, arkiv } = b;
  if (!feed || !issuer || !cre || !oracle || !vault || !arkiv) return null;
  const wide = Math.abs(cre.y - feed.y) < 4;
  if (wide) {
    const y = feed.y + feed.h / 2;
    const cx = cre.x + cre.w / 2;
    const iy = issuer.y + issuer.h / 2;
    const vx = vault.x + vault.w / 2;
    const nav: Pt[] = [
      [right(feed), y],
      [cre.x, y],
    ];
    const status: Pt[] = [
      [right(issuer), iy],
      [cx, iy],
      [cx, bottom(cre)],
    ];
    const report: Pt[] = [
      [right(cre), y],
      [oracle.x, y],
    ];
    const price: Pt[] = [
      [right(oracle), y],
      [vault.x, y],
    ];
    const sale: Pt[] = [
      [vx, bottom(vault)],
      [vx, arkiv.y],
    ];
    return {
      wires: [
        { id: "nav", d: roundPath(nav), pts: nav },
        { id: "status", d: roundPath(status, 16), pts: status },
        { id: "report", d: roundPath(report), pts: report },
        { id: "price", d: roundPath(price), pts: price },
        { id: "sale", d: roundPath(sale), pts: sale },
      ],
      labels: {
        nav: { at: [(right(feed) + cre.x) / 2, y - 22], anchor: "center" },
        status: { at: [(right(issuer) + cx) / 2, iy - 22], anchor: "center" },
        report: { at: [(right(cre) + oracle.x) / 2, y - 22], anchor: "center" },
        price: { at: [(right(oracle) + vault.x) / 2, y - 22], anchor: "center" },
        sale: { at: [vx - 16, (bottom(vault) + arkiv.y) / 2], anchor: "right" },
      },
    };
  }
  const fx = feed.x + feed.w / 2;
  const ix = issuer.x + issuer.w / 2;
  const x = cre.x + cre.w / 2;
  const g0 = (Math.max(bottom(feed), bottom(issuer)) + cre.y) / 2;
  const nav: Pt[] = [
    [fx, bottom(feed)],
    [fx, cre.y],
  ];
  const status: Pt[] = [
    [ix, bottom(issuer)],
    [ix, cre.y],
  ];
  const report: Pt[] = [
    [x, bottom(cre)],
    [x, oracle.y],
  ];
  const price: Pt[] = [
    [x, bottom(oracle)],
    [x, vault.y],
  ];
  const sale: Pt[] = [
    [x, bottom(vault)],
    [x, arkiv.y],
  ];
  return {
    wires: [
      { id: "nav", d: roundPath(nav), pts: nav },
      { id: "status", d: roundPath(status), pts: status },
      { id: "report", d: roundPath(report), pts: report },
      { id: "price", d: roundPath(price), pts: price },
      { id: "sale", d: roundPath(sale), pts: sale },
    ],
    labels: {
      nav: { at: [fx, g0], anchor: "center" },
      status: { at: [ix, g0], anchor: "center" },
      report: { at: [x, (bottom(cre) + oracle.y) / 2], anchor: "center" },
      price: { at: [x, (bottom(oracle) + vault.y) / 2], anchor: "center" },
      sale: { at: [x, (bottom(vault) + arkiv.y) / 2], anchor: "center" },
    },
  };
}

/// Where the price comes from, as a scene: the Chainlink price and the
/// issuer's status flow into the CRE workflow, one signed report travels to
/// NavOracle on Arc and on to the vault, and each sale is written to Arkiv.
/// Loops only while on screen; reduced motion and off screen show the still
/// frame with every label on its wire.
export function OracleFlow() {
  const { ref, mode, play, animated } = useScene<HTMLElement>();
  const root = useRef<HTMLDivElement>(null);
  const m = useBoxes(root);
  const geo = m ? geometry(m.boxes) : null;
  const { phase, cycle } = usePhase(play, DURATIONS);
  const cur = phase >= 0 ? PHASES[phase] : undefined;
  const show = mode !== "pre";
  const on = (id: string) => !!cur?.focus.includes(id);
  const arrived = (id: string, p: number) => (phase === p ? `${cycle}-${id}` : undefined);

  const lit: Record<string, { key: string; duration: number }> = {};
  for (const w of cur?.wires ?? []) lit[w] = { key: `${cycle}-${phase}`, duration: (cur!.ms / 1000) * 0.8 };

  return (
    <figure ref={ref} className="text-left">
      <Stage enabled={animated}>
        <div role="img" aria-label={LABEL}>
          <div ref={root} className="relative mx-auto max-w-md lg:max-w-none">
            {m && geo && <Wires wires={geo.wires} w={m.w} h={m.h} mode={mode} lit={lit} />}
            <div className="grid grid-cols-2 gap-x-3 gap-y-[72px] lg:grid-cols-[minmax(0,1fr)_104px_minmax(0,1fr)_104px_minmax(0,1fr)_104px_minmax(0,1fr)] lg:grid-rows-[auto_88px_auto] lg:gap-x-0 lg:gap-y-0">
              <NodeCard id="feed" icon={Radio} title="Chainlink price feed" sub="Ethereum" show={show} active={on("feed")} className="lg:col-start-1 lg:row-start-1" />
              <NodeCard id="issuer" icon={BadgeCheck} title="Issuer status" sub="OK or a problem" show={show} enterDelay={0.08} active={on("issuer")} className="lg:col-start-1 lg:row-start-3" />
              <NodeCard id="cre" icon={Workflow} title="CRE workflow" sub="Signs one report" show={show} enterDelay={0.16} active={on("cre")} pulse={arrived("cre", 1)} className="col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-1" />
              <NodeCard id="oracle" icon={Gauge} title="NavOracle" sub="On Arc" show={show} enterDelay={0.24} active={on("oracle")} pulse={arrived("oracle", 2)} className="col-span-2 lg:col-span-1 lg:col-start-5 lg:row-start-1" />
              <NodeCard id="vault" icon={Scale} title="Vault" sub="Prices each sale" show={show} enterDelay={0.32} active={on("vault")} pulse={arrived("vault", 3)} className="col-span-2 lg:col-span-1 lg:col-start-7 lg:row-start-1" />
              <NodeCard id="arkiv" icon={BookOpen} title="Arkiv" sub="The public book" show={show} enterDelay={0.4} active={on("arkiv")} pulse={arrived("arkiv", 4)} className="col-span-2 lg:col-span-1 lg:col-start-7 lg:row-start-3" />
            </div>
            {geo && (
              <>
                {WIRE_IDS.map((k) => (
                  <Resting key={k} at={geo.labels[k].at} anchor={geo.labels[k].anchor} show={show} delay={0.9} active={!!cur?.wires.includes(k)}>
                    <Token {...CHIPS[k]} active={!!cur?.wires.includes(k)} />
                  </Resting>
                ))}
                {cur?.wires.map((k) => (
                  <Traveler key={`${cycle}-${phase}-${k}`} pts={geo.wires.find((w) => w.id === k)!.pts} duration={(cur.ms / 1000) * 0.82} trail={CHIPS[k].tone}>
                    <Coin icon={CHIPS[k].icon} tone={CHIPS[k].tone} />
                  </Traveler>
                ))}
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
