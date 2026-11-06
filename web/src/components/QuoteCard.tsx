"use client";

import type { Quote } from "@/lib/types";
import { bpsSum } from "@/lib/types";
import { fmtBps, fmtDate, fmtNav, fmtUsdc, timeAgo, timeUntil } from "@/lib/format";
import { Card, Row, Spinner, Swap, VerdictPill } from "./ui/primitives";
import { useNow } from "@/hooks/useNow";
import { SpreadBar, TermKey } from "./viz/SpreadBar";

export function QuoteCard({ quote, pending, symbol }: { quote?: Quote; pending: boolean; symbol: string }) {
  const now = useNow(10_000);
  if (!quote) {
    return (
      <Card className="flex min-h-40 items-center justify-center">
        {pending ? <Spinner className="text-muted" /> : <span className="t-caption">Enter an amount to see the price</span>}
      </Card>
    );
  }
  const spread = bpsSum(quote);
  return (
    <Card aria-busy={pending || undefined}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Swap k={`${quote.verdict}:${quote.reason}`}>
          <VerdictPill verdict={quote.verdict} reason={quote.reason} />
        </Swap>
        <span className="t-caption tnum">NAV {fmtNav(quote.nav)} · {timeAgo(quote.navUpdatedAt, now)}</span>
      </div>

      <div className="mt-4">
        <div className="t-caption">You receive now</div>
        <Swap k={quote.payout.toString()} className="t-display tnum">
          {fmtUsdc(quote.payout)}
        </Swap>
        <div className="t-caption tnum mt-1">
          {fmtUsdc(quote.value)} at NAV, minus a {fmtBps(spread)} spread · paid in USDC on Arc
        </div>
      </div>

      <SpreadBar className="mt-5" legend={false} bps={[quote.baseBps, quote.utilBps, quote.timeBps, quote.creditBps]} />

      <div className="hairline-rows mt-4">
        <Row label={<><TermKey i={0} />Base</>} hint="Covers the vault's cost of doing business" value={fmtBps(quote.baseBps)} />
        <Row label={<><TermKey i={1} />Vault usage</>} hint="Rises as more USDC is deployed" value={fmtBps(quote.utilBps)} />
        <Row label={<><TermKey i={2} />Time to payout</>} hint={`Pays ${fmtDate(quote.settleAt)}, in ${timeUntil(quote.settleAt, now)}`} value={fmtBps(quote.timeBps)} />
        <Row label={<><TermKey i={3} />Issuer credit</>} hint="Risk the issuer pays late or less" value={fmtBps(quote.creditBps)} />
        <Row label={<span className="font-semibold">Total spread</span>} value={<span className="font-semibold">{fmtBps(spread)}</span>} />
      </div>

      <div className="t-caption mt-3 tnum">Room left for {symbol} in the vault: {fmtUsdc(quote.capacityLeft)}</div>
    </Card>
  );
}
