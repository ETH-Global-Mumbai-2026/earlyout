"use client";

import { Abbr } from "./ui/Abbr";
import type { Quote } from "@/lib/types";
import { bpsSum } from "@/lib/types";
import { fmtBps, fmtDate, fmtUsdc, timeUntil } from "@/lib/format";
import { Spinner, Swap, VerdictPill } from "./ui/primitives";
import { useNow } from "@/hooks/useNow";
import { SpreadBar, TermKey } from "./viz/SpreadBar";
import { Ring } from "./viz/Ring";

const TERMS = [
  ["Base", "baseBps"],
  ["Vault usage", "utilBps"],
  ["Time to payout", "timeBps"],
  ["Issuer credit", "creditBps"],
] as const;

function Line({ label, children, strong }: { label: React.ReactNode; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="ios-row">
      <span className={strong ? "flex-1 text-[17px] font-semibold" : "flex-1 text-[15px] text-ink-2"}>{label}</span>
      <span className={strong ? "" : "num text-[15px] text-ink"}>{children}</span>
    </div>
  );
}

/// What the seller can do instead, in plain words, when the vault will not buy.
function blockedHint(q: Quote, symbol: string): string {
  if (q.reason === "Over the fund cap") return `The vault can take ${fmtUsdc(q.capacityLeft)} more of ${symbol} right now. Try a smaller amount.`;
  if (q.reason === "Vault short of USDC") return "The vault does not hold enough idle USDC for this sale. Try a smaller amount.";
  if (q.verdict === "HALT") return "Trading in this fund is paused, so nothing will move. It resumes once the oracle or the owner clears it.";
  return `Nothing will move: ${q.reason.toLowerCase()}.`;
}

/// The price, as iOS rows meant to sit inside a grouped section: verdict first,
/// then gross, the four spread terms, what you receive, and the settlement facts.
export function QuoteCard({ quote, pending, symbol }: { quote?: Quote; pending: boolean; symbol: string }) {
  const now = useNow(10_000);
  if (!quote) {
    return (
      <div className="flex min-h-32 items-center justify-center px-4 text-muted">
        {pending ? <Spinner /> : <span className="text-[15px]">Enter an amount to see the price</span>}
      </div>
    );
  }
  const spread = bpsSum(quote);
  const minOut = (quote.payout * 995n) / 1000n;
  return (
    <div aria-busy={pending || undefined}>
      <div className="ios-row">
        <Swap k={`${quote.verdict}:${quote.reason}`}>
          <VerdictPill verdict={quote.verdict} reason={quote.reason} />
        </Swap>
      </div>
      <Line
        label={
          <>
            Gross at <Abbr k="NAV" />
          </>
        }
      >
        {fmtUsdc(quote.value, true)}
      </Line>
      <div className="ios-row block">
        <SpreadBar thin legend={false} bps={[quote.baseBps, quote.utilBps, quote.timeBps, quote.creditBps]} />
        <div className="mt-3 grid gap-1.5">
          {TERMS.map(([name, key], i) => (
            <div key={name} className="flex justify-between text-[14px]">
              <span className="text-ink-2">
                <TermKey i={i} />
                {name}
              </span>
              <span className="num">{fmtBps(quote[key])}</span>
            </div>
          ))}
        </div>
      </div>
      <Line label="Total spread">{fmtBps(spread)}</Line>
      {quote.verdict === "BUY" ? (
        <>
          <div className="ios-row min-h-[72px]">
            <Ring value={Number(quote.payout)} max={Number(quote.value)} size={46} stroke={6} color="var(--color-dot-buy)" label={`You keep ${quote.value > 0n ? ((Number(quote.payout) / Number(quote.value)) * 100).toFixed(1) : "0"}% of NAV`}>
              <span className="num text-[11px] font-semibold">{quote.value > 0n ? Math.round((Number(quote.payout) / Number(quote.value)) * 100) : 0}%</span>
            </Ring>
            <span className="flex-1 text-[17px] font-semibold">
              You receive now
              <span className="block text-[13px] font-normal text-muted">of the value at NAV</span>
            </span>
            <Swap k={quote.payout.toString()} className="num text-[28px] font-bold tracking-[-0.02em]">
              {fmtUsdc(quote.payout, true)}
            </Swap>
          </div>
          <Line label="Minimum received">{fmtUsdc(minOut, true)}</Line>
        </>
      ) : (
        <div className="ios-row">
          <span className="flex-1 text-[15px] leading-snug text-ink-2">{blockedHint(quote, symbol)}</span>
        </div>
      )}
      <Line label="Claim pays the vault">
        <span title={fmtDate(quote.settleAt)} className="whitespace-nowrap">
          in {timeUntil(quote.settleAt, now)}
        </span>
      </Line>
      <Line label="Settlement">Same transaction</Line>
      <Line label={`Capacity left for ${symbol}`}>{fmtUsdc(quote.capacityLeft)}</Line>
    </div>
  );
}
