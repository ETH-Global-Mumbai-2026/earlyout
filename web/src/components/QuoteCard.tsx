"use client";

import { Spinner } from "./ui/primitives";
import { TermLine } from "./ui/TermSheet";
import { VerdictStamp } from "./ui/VerdictStamp";
import { SpreadBar } from "./viz/SpreadBar";
import type { Quote } from "@/lib/types";
import { bpsSum } from "@/lib/types";
import { COPY, TERM_LABELS } from "@/lib/copy";
import { fmtBps, fmtCut, fmtDay, fmtUsdc } from "@/lib/format";
import { annualisedBps, daysSkipped } from "@/lib/metrics";
import { useNow } from "@/hooks/useNow";

/// What the seller can do instead, in plain words, when the pool will not buy.
export function blockedHint(q: Quote, symbol: string): string {
  if (q.reason === "Over the fund cap") return `The pool can take ${fmtUsdc(q.capacityLeft)} more of ${symbol} right now. Try a smaller amount.`;
  if (q.reason === "Amount too small") return "This amount is too small to pay out anything. Try a larger amount.";
  if (q.reason === "Vault short of USDC") return "The pool doesn't have enough spare cash for this sale right now. Try a smaller amount.";
  if (q.verdict === "HALT") return COPY.verdicts.HALT;
  return COPY.verdicts.REFUSE;
}

/// The sale, in the order a seller reads it: what you get, the answer, then
/// why. Sits inside the "Your sale" term sheet under the amount field.
export function QuoteCard({ quote, pending, symbol, action }: { quote?: Quote; pending: boolean; symbol: string; action?: React.ReactNode }) {
  const now = useNow(10_000);
  if (!quote) {
    return (
      <div className="flex min-h-28 items-center justify-center text-[14px] text-muted">
        {pending ? <Spinner /> : "Enter an amount to see your price."}
      </div>
    );
  }
  const total = bpsSum(quote);
  const minOut = (quote.payout * 995n) / 1000n;
  const skip = daysSkipped(quote.settleAt, now);
  const unit = skip.value === 1 ? (skip.unit.slice(0, -1) as "day" | "hour" | "minute") : skip.unit;
  const yearly = annualisedBps(total, quote.settleAt - now);
  const buy = quote.verdict === "BUY";
  // Show capacity only when this sale would use most of what is left.
  const tight = buy && quote.capacityLeft > 0n && quote.payout * 10n >= quote.capacityLeft * 8n;

  return (
    <div aria-busy={pending || undefined}>
      <div className="flex items-end justify-between gap-4 py-3">
        <div>
          <div className="t-label">{buy ? "You receive now" : "Not available"}</div>
          <div className={`t-figure mt-1 text-[2.25rem] leading-none ${buy ? "" : "text-muted line-through decoration-1"}`}>{fmtUsdc(quote.payout, quote.payout < 10_000n)}</div>
        </div>
        <VerdictStamp verdict={quote.verdict} reason={quote.reason} className="!rotate-[-4deg] text-[13px]" />
      </div>
      <p className="text-[13px] leading-relaxed text-ink-2">
        {buy ? (
          <>
            {COPY.figures.skip(skip.value, unit)}. {yearly === null ? COPY.figures.withinWeek : COPY.figures.annualised(fmtBps(yearly))}.
          </>
        ) : (
          blockedHint(quote, symbol)
        )}
      </p>
      {!buy && quote.reason && <p className="mt-1 font-mono text-[11px] text-muted">{quote.reason}</p>}
      {action && <div className="mt-4">{action}</div>}

      <details className="group mt-4 border-t border-hairline pt-2" open>
        <summary className="t-label cursor-pointer list-none py-1 hover:text-ink">{COPY.terms.why}</summary>
        <TermLine label={COPY.terms.value} value={fmtUsdc(quote.value, true)} />
        <TermLine label={TERM_LABELS[0]} value={fmtCut(quote.baseBps)} tone={quote.baseBps > 0 ? "neg" : undefined} />
        <TermLine label={TERM_LABELS[1]} value={fmtCut(quote.utilBps)} tone={quote.utilBps > 0 ? "neg" : undefined} />
        <TermLine label={TERM_LABELS[2]} value={fmtCut(quote.timeBps)} tone={quote.timeBps > 0 ? "neg" : undefined} />
        <TermLine label={TERM_LABELS[3]} value={fmtCut(quote.creditBps)} tone={quote.creditBps > 0 ? "neg" : undefined} />
        <TermLine label={COPY.terms.total} value={fmtBps(total)} tone="strong" />
        <SpreadBar thin legend={false} className="my-3" bps={[quote.baseBps, quote.utilBps, quote.timeBps, quote.creditBps]} />
        {buy && <TermLine label="Minimum you'll get" value={fmtUsdc(minOut, true)} />}
        <TermLine label="Fund pays out" value={fmtDay(quote.settleAt)} />
        {tight && <TermLine label={`Room left for ${symbol}`} value={fmtUsdc(quote.capacityLeft)} />}
      </details>
    </div>
  );
}
