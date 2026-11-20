"use client";

import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/art/EmptyState";
import { FundMark } from "@/components/brand/FundMark";
import { Notice, Spinner } from "@/components/ui/primitives";
import { useBook } from "@/hooks/useBook";
import { errorMessage } from "@/hooks/useEarlyout";
import { useNow } from "@/hooks/useNow";
import { addresses } from "@/lib/addresses";
import { COPY } from "@/lib/copy";
import { fmtBps, fmtDay, fmtUnits, fmtUsdc, timeUntil } from "@/lib/format";
import { expectedReturn } from "@/lib/metrics";
import { positionsSummary, valueAtPayout } from "@/lib/positions";

const C = COPY.app.positions;

export default function PositionsPage() {
  const book = useBook();
  const now = useNow();
  const held = (book.data?.claims ?? []).filter(
    (c) => book.data?.source === "mock" || !addresses.vault || c.holder.toLowerCase() === addresses.vault.toLowerCase(),
  );
  const sum = positionsSummary(held);
  const ret = expectedReturn(sum.cost, sum.expected, 0);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <AppHeader title={C.title}>{C.description}</AppHeader>

      {book.isPending && (
        <div className="flex justify-center py-10 text-muted">
          <Spinner />
        </div>
      )}
      {book.isError && <Notice tone="error">Could not load the payouts: {errorMessage(book.error)}</Notice>}

      {book.data && (
        <dl className="grid grid-cols-2 gap-px overflow-hidden border-y border-hairline bg-hairline sm:grid-cols-4">
          {(
            [
              [C.deployed, fmtUsdc(sum.cost, true)],
              [C.expected, fmtUsdc(sum.expected, true)],
              [C.profit, fmtUsdc(sum.profit, true)],
              [COPY.figures.expectedReturn, fmtBps(ret.bps)],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="bg-canvas px-4 py-4">
              <dt className="t-label min-h-8">{k}</dt>
              <dd className="t-figure mt-1.5 text-[1.5rem] leading-none">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {book.data && held.length === 0 && <EmptyState art="positions" title={C.empty} />}

      {held.length > 0 && (
        <div className="overflow-x-auto border-y border-ink">
          <table className="tbl min-w-[720px]" aria-label="Payouts the pool holds">
            <thead>
              <tr>
                <th>Fund</th>
                <th className="r">Units</th>
                <th className="r">Paid</th>
                <th className="r">Worth at payout</th>
                <th className="r">Return</th>
                <th className="r">Pays</th>
              </tr>
            </thead>
            <tbody>
              {held.map((c) => {
                const worth = valueAtPayout(c);
                const r = expectedReturn(BigInt(c.usdcPaid), worth, c.settleAt - now);
                return (
                  <tr key={c.key}>
                    <td>
                      <span className="flex items-center gap-3">
                        <FundMark symbol={c.symbol} size={24} />
                        <span className="font-medium text-ink">{c.symbol}</span>
                      </span>
                    </td>
                    <td className="r num">{fmtUnits(BigInt(c.amount))}</td>
                    <td className="r num">{fmtUsdc(BigInt(c.usdcPaid), true)}</td>
                    <td className="r num">{fmtUsdc(worth, true)}</td>
                    <td className="r num text-buy">
                      {fmtUsdc(r.profit, true)} <span className="text-muted">· {fmtBps(r.bps)}</span>
                    </td>
                    <td className="r">
                      <span className="num block">{fmtDay(c.settleAt)}</span>
                      <span className="block text-[12px] text-muted">in {timeUntil(c.settleAt, now)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
