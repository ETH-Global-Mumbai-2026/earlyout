"use client";

import { Abbr } from "@/components/ui/Abbr";
import { useState } from "react";
import { Notice, Panel, Segmented, Spinner } from "@/components/ui/primitives";
import { ClaimsTimeline } from "@/components/viz/ClaimsTimeline";
import { AppHeader } from "@/components/AppHeader";
import { useBook } from "@/hooks/useBook";
import { useNow } from "@/hooks/useNow";
import { txUrl } from "@/lib/chain";
import { fmtDate, fmtUnits, fmtUsdc, shortAddr, timeUntil } from "@/lib/format";

export default function BookPage() {
  const book = useBook();
  const now = useNow(10_000);
  const [filter, setFilter] = useState<string>("all");
  const symbols = Array.from(new Set(book.data?.claims.map((c) => c.symbol) ?? []));
  const rows = (book.data?.claims ?? []).filter((c) => filter === "all" || c.symbol === filter);
  const total = rows.reduce((a, c) => a + BigInt(c.usdcPaid), 0n);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <AppHeader title="Book">
          Every open claim, read straight from Arkiv, a public database anyone can query. Each entry disappears on its payout date without anyone deleting it.
        </AppHeader>
        {book.data && (
          <Segmented label="Fund" value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, ...symbols.map((s) => ({ value: s, label: s }))]} />
        )}
      </div>

      {book.isPending && (
        <div className="flex justify-center py-10 text-muted">
          <Spinner />
        </div>
      )}
      {book.isError && <Notice tone="error">{(book.error as Error).message}</Notice>}

      {book.data && (
        <>
          {rows.length > 0 && (
            <Panel title="Payout timeline" note="One lane per fund, one dot per claim" bodyClassName="px-4 pb-3 pt-2">
              <ClaimsTimeline claims={rows} now={now} />
            </Panel>
          )}
          <Panel title="Open claims" note={`${rows.length} open · ${fmtUsdc(total)} deployed`}>
            <div className="overflow-x-auto">
              <table className="tbl min-w-[860px]">
                <thead>
                  <tr>
                    <th>Fund</th>
                    <th className="r">Units</th>
                    <th className="r">Paid</th>
                    <th className="r">
                      <Abbr k="NAV" />
                    </th>
                    <th className="r">Spread</th>
                    <th>Pays</th>
                    <th>Seller</th>
                    <th>Held by</th>
                    <th>Proof</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.key}>
                      <td className="font-semibold">{c.symbol}</td>
                      <td className="num r">{fmtUnits(BigInt(c.amount))}</td>
                      <td className="num r">{fmtUsdc(BigInt(c.usdcPaid), true)}</td>
                      <td className="num r">{(Number(BigInt(c.nav) / 10n ** 14n) / 10_000).toFixed(4)}</td>
                      <td className="num r">{((c.baseBps + c.utilBps + c.timeBps + c.creditBps) / 100).toFixed(2)}%</td>
                      <td className="num">
                        {fmtDate(c.settleAt)} <span className="text-muted">· {timeUntil(c.settleAt, now)}</span>
                      </td>
                      <td className="num text-muted">{shortAddr(c.seller)}</td>
                      <td className="num text-muted">{shortAddr(c.holder)}</td>
                      <td className="space-x-3">
                        <a className="text-accent hover:underline" href={txUrl(c.txHash)} target="_blank" rel="noreferrer">
                          Arc tx
                        </a>
                        <a className="text-accent hover:underline" href={`${book.data.explorer}/entity/${c.key}`} target="_blank" rel="noreferrer">
                          Arkiv entity
                        </a>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center text-muted">
                        No open claims yet. Sell one and it appears here within seconds.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
          <p className="t-caption">
            Written to Arkiv Rabdi by {book.data.writer ? <span className="t-mono">{book.data.writer}</span> : "the Earlyout writer wallet"}. Every read filters by that wallet.
          </p>
        </>
      )}
    </div>
  );
}
