"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";
import { blockedHint } from "../QuoteCard";
import { TermSheet } from "../ui/TermSheet";
import { VerdictStamp } from "../ui/VerdictStamp";
import { Spinner } from "../ui/primitives";
import type { Door } from "./HeroDoors";
import { useFunds, useQuote, useVault } from "@/hooks/useEarlyout";
import { useBook } from "@/hooks/useBook";
import { useNow } from "@/hooks/useNow";
import { COPY, TERM_LABELS } from "@/lib/copy";
import { fmtBps, fmtCut, fmtDay, fmtUsdc } from "@/lib/format";
import { annualisedBps, daysSkipped, expectedReturn } from "@/lib/metrics";
import { HERO_PROBE, perUnitQuote } from "@/lib/perUnit";
import { bpsSum, type Quote } from "@/lib/types";
import { toWire } from "@/lib/wire";

const S = COPY.home.hero.sheet;
const EASE = [0.22, 1, 0.36, 1] as const;
const VIZ = ["bg-viz-1", "bg-viz-2", "bg-viz-3", "bg-viz-4"];

/// Live sheet beside the hero copy. Each door shows its own sheet; the holder
/// sheet plays its sequence once (lines, bar, total, stamp) and replays at
/// double speed when the door changes. Reduced motion shows the final frame.
export function HeroQuote({ door, replay = false }: { door: Door; replay?: boolean }) {
  const reduce = useReducedMotion();
  const speed = replay ? 0.5 : 1;
  const funds = useFunds();
  const fund = funds.data?.find((f) => f.symbol === "ACRED");
  const quote = useQuote(fund?.address, fund ? HERO_PROBE : null);

  return (
    <div role="region" aria-label="Live quote" className="w-full">
      {door === "holder" && <HolderSheet key="holder" q={quote.data} speed={speed} still={!!reduce} />}
      {door === "lp" && <LpSheet key="lp" speed={speed} still={!!reduce} />}
      {door === "platform" && <PlatformSheet key="platform" q={quote.data} fund={fund?.address} still={!!reduce} />}
    </div>
  );
}

function lines(speed: number, still: boolean): Variants {
  return {
    hidden: still ? { opacity: 1 } : { opacity: 0, y: 4 },
    show: (i: number) => ({ opacity: 1, y: 0, transition: still ? { duration: 0 } : { delay: i * 0.12 * speed, duration: 0.3 * speed, ease: EASE } }),
  };
}

function Line({ i, v, label, value, tone }: { i: number; v: Variants; label: ReactNode; value: ReactNode; tone?: "neg" | "strong" }) {
  return (
    <motion.div custom={i} variants={v} className="rule-dashed flex items-baseline justify-between gap-4 py-2 text-[14px]">
      <span className={tone === "strong" ? "font-medium text-ink" : "text-ink-2"}>{label}</span>
      <span className={`num shrink-0 text-right ${tone === "neg" ? "text-neg" : ""} ${tone === "strong" ? "font-medium" : ""}`}>{value}</span>
    </motion.div>
  );
}

function Loading() {
  return (
    <div className="sheet grid h-[420px] place-items-center text-muted">
      <Spinner />
    </div>
  );
}

function HolderSheet({ q: probe, speed, still }: { q?: Quote; speed: number; still: boolean }) {
  const now = useNow();
  if (!probe) return <Loading />;
  const q = perUnitQuote(probe, HERO_PROBE);
  const terms = [q.baseBps, q.utilBps, q.timeBps, q.creditBps];
  const total = bpsSum(q);
  const skip = daysSkipped(q.settleAt, now);
  const unit = skip.value === 1 ? (skip.unit.slice(0, -1) as "day" | "hour" | "minute") : skip.unit;
  const yearly = annualisedBps(total, q.settleAt - now);
  // Under REFUSE or HALT the sheet must not read as an offer: the figure is
  // struck through and the reason is written out, not only in the stamp.
  const buy = q.verdict === "BUY";
  const v = lines(speed, still);
  const n = 6; // lines before the bar
  const barStart = still ? 0 : n * 0.12 * speed;
  const totalAt = still ? 0 : barStart + 4 * 0.25 * speed;

  return (
    <motion.div initial="hidden" animate="show">
      <TermSheet raised header={S.holderHeader} aside={`Pays ${fmtDay(q.settleAt)}`}>
        <Line i={0} v={v} label={COPY.terms.value} value={fmtUsdc(q.value)} />
        <Line i={1} v={v} label={TERM_LABELS[0]} value={fmtCut(q.baseBps)} tone={q.baseBps > 0 ? "neg" : undefined} />
        <Line i={2} v={v} label={TERM_LABELS[1]} value={fmtCut(q.utilBps)} tone={q.utilBps > 0 ? "neg" : undefined} />
        <Line i={3} v={v} label={TERM_LABELS[2]} value={fmtCut(q.timeBps)} tone={q.timeBps > 0 ? "neg" : undefined} />
        <Line i={4} v={v} label={TERM_LABELS[3]} value={fmtCut(q.creditBps)} tone={q.creditBps > 0 ? "neg" : undefined} />
        <Line i={5} v={v} label={COPY.terms.total} value={fmtBps(total)} tone="strong" />

        <div className="mt-4 flex h-2 w-full overflow-hidden rounded-[2px] bg-viz-track" aria-hidden>
          {terms.map((bps, i) => (
            <motion.span
              key={i}
              className={`h-full origin-left ${VIZ[i]}`}
              style={{ width: `${total ? (bps / total) * 100 : 0}%` }}
              initial={still ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={still ? { duration: 0 } : { delay: barStart + i * 0.25 * speed, duration: 0.25 * speed, ease: EASE }}
            />
          ))}
        </div>

        <motion.div
          className="mt-5 flex items-end justify-between gap-4"
          initial={still ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={still ? { duration: 0 } : { delay: totalAt, duration: 0.4 * speed }}
        >
          <div>
            <div className="t-label">{buy ? S.receive : "Not available"}</div>
            <div className={`t-figure mt-1 text-[clamp(2rem,4vw,2.75rem)] leading-none ${buy ? "" : "text-muted line-through decoration-1"}`}>{fmtUsdc(q.payout)}</div>
            {buy ? (
              <div className="mt-2 text-[13px] text-muted">
                {COPY.figures.skip(skip.value, unit)}. {yearly === null ? COPY.figures.withinWeek : COPY.figures.annualised(fmtBps(yearly))}.
              </div>
            ) : (
              <div className="mt-2 max-w-[28ch] text-[13px] text-ink-2">
                {q.reason ? `${q.reason}. ` : ""}
                {blockedHint(q, "ACRED")}
              </div>
            )}
          </div>
          <motion.div
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={still ? { duration: 0 } : { delay: totalAt + 0.3 * speed, duration: 0.01 }}
          >
            <VerdictStamp verdict={q.verdict} reason={q.reason} animate={!still} className="!rotate-[-4deg] text-[13px]" />
          </motion.div>
        </motion.div>
      </TermSheet>
      <p className="t-caption mt-3">{S.perUnitCaption}</p>
    </motion.div>
  );
}

function LpSheet({ speed, still }: { speed: number; still: boolean }) {
  const vault = useVault().data;
  const book = useBook().data;
  if (!vault) return <Loading />;
  const open = (book?.claims ?? []).filter((c) => c.status === "open");
  const cost = open.reduce((s, c) => s + BigInt(c.usdcPaid), 0n);
  // amount (18dp) × nav (18dp) → USDC (6dp)
  const atSettlement = open.reduce((s, c) => s + (BigInt(c.amount) * BigInt(c.nav)) / 10n ** 30n, 0n);
  const ret = expectedReturn(cost, atSettlement, 0);
  const deployedPct = vault.totalAssets ? Number((vault.deployed * 10_000n) / vault.totalAssets) : 0;
  const v = lines(speed, still);
  return (
    <motion.div initial="hidden" animate="show">
      <TermSheet raised header={S.lpHeader} aside="Arc testnet">
        <Line i={0} v={v} label="Share price" value={fmtUsdc(vault.sharePrice, true)} />
        <Line i={1} v={v} label="Total assets" value={fmtUsdc(vault.totalAssets)} />
        <Line i={2} v={v} label="Deployed" value={fmtBps(deployedPct)} />
        <Line i={3} v={v} label="Open claims" value={book ? open.length : "…"} />
        <Line i={4} v={v} label="Expected at settlement" value={book ? fmtUsdc(atSettlement, true) : "…"} tone="strong" />
        <Line i={5} v={v} label={COPY.figures.expectedReturn} value={book ? `${fmtUsdc(ret.profit, true)} · ${fmtBps(ret.bps)}` : "…"} />
      </TermSheet>
      <p className="t-caption mt-3">Read live from the Vault and the public book on Arkiv.</p>
    </motion.div>
  );
}

function PlatformSheet({ q, fund, still }: { q?: Quote; fund?: string; still: boolean }) {
  if (!q || !fund) return <Loading />;
  const body = JSON.stringify(JSON.parse(toWire(q)), null, 2);
  return (
    <motion.div initial={still ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: still ? 0 : 0.25 }}>
      <TermSheet raised header="GET /api/quote" aside="200 OK">
        <div className="t-mono break-all py-2 text-[12px] text-muted">
          ?fund={fund.slice(0, 10)}…&amp;amount={HERO_PROBE.toString()}
        </div>
        <pre className="max-h-[300px] overflow-auto rounded-[4px] bg-sunk p-3 font-mono text-[12px] leading-relaxed text-ink-2">{body}</pre>
      </TermSheet>
      <p className="t-caption mt-3">{S.platformCaption}</p>
    </motion.div>
  );
}
