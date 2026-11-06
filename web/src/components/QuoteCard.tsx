"use client";

import { Abbr } from "./ui/Abbr";
import type { Quote } from "@/lib/types";
import { bpsSum } from "@/lib/types";
import { fmtBps, fmtDate, fmtUsdc, timeUntil } from "@/lib/format";
import { Spinner, Swap, VerdictPill } from "./ui/primitives";
import { useNow } from "@/hooks/useNow";
import { SpreadBar, TermKey } from "./viz/SpreadBar";

const TERMS = [
  ["Base", "baseBps"],
  ["Vault usage", "utilBps"],
  ["Time to payout", "timeBps"],
  ["Issuer credit", "creditBps"],
] as const;

/// The ticket's price breakdown: verdict, gross, the four terms, net, settlement facts.
export function QuoteCard({ quote, pending, symbol }: { quote?: Quote; pending: boolean; symbol: string }) {
  const now = useNow(10_000);
  if (!quote) {
    return (
      <div className="flex min-h-36 items-center justify-center rounded-xl border border-hairline text-muted">
        {pending ? <Spinner /> : <span className="t-caption">Enter an amount to see the price</span>}
      </div>
    );
  }
  const spread = bpsSum(quote);
  const minOut = (quote.payout * 995n) / 1000n;
  return (
    <div className="grid gap-3" aria-busy={pending || undefined}>
      <Swap k={`${quote.verdict}:${quote.reason}`}>
        <VerdictPill verdict={quote.verdict} reason={quote.reason} />
      </Swap>
      <div className="overflow-hidden rounded-xl border border-hairline">
        <div className="flex justify-between border-b border-hairline px-3 py-2">
          <span className="text-muted">
            Gross at <Abbr k="NAV" />
          </span>
          <span className="num">{fmtUsdc(quote.value, true)}</span>
        </div>
        <div className="border-b border-hairline px-3 py-2.5">
          <SpreadBar thin legend={false} bps={[quote.baseBps, quote.utilBps, quote.timeBps, quote.creditBps]} />
          <div className="mt-2.5 grid gap-1">
            {TERMS.map(([name, key], i) => (
              <div key={name} className="flex justify-between text-[13px]">
                <span className="text-ink-2">
                  <TermKey i={i} />
                  {name}
                </span>
                <span className="num">{fmtBps(quote[key])}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between border-b border-hairline px-3 py-2">
          <span className="text-muted">Total spread</span>
          <span className="num font-medium">{fmtBps(spread)}</span>
        </div>
        <div className="flex items-baseline justify-between bg-surface-2 px-3 py-3">
          <span className="font-medium">You receive now</span>
          <Swap k={quote.payout.toString()} className="num text-xl font-semibold">
            {fmtUsdc(quote.payout, true)}
          </Swap>
        </div>
      </div>
      <dl className="grid gap-1 text-[13px]">
        <div className="flex justify-between">
          <dt className="text-muted">Minimum received</dt>
          <dd className="num">{fmtUsdc(minOut, true)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Claim pays the vault</dt>
          <dd className="num whitespace-nowrap" title={fmtDate(quote.settleAt)}>
            in {timeUntil(quote.settleAt, now)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Settlement</dt>
          <dd>Same transaction</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Capacity left for {symbol}</dt>
          <dd className="num">{fmtUsdc(quote.capacityLeft)}</dd>
        </div>
      </dl>
    </div>
  );
}
