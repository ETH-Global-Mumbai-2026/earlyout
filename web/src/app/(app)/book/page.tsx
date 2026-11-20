"use client";

import Link from "next/link";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/art/EmptyState";
import { FundMark } from "@/components/brand/FundMark";
import { Notice, Segmented, Spinner } from "@/components/ui/primitives";
import { ClaimsTimeline } from "@/components/viz/ClaimsTimeline";
import { useBook } from "@/hooks/useBook";
import { useNow } from "@/hooks/useNow";
import { txUrl } from "@/lib/chain";
import { COPY } from "@/lib/copy";
import { fmtBps, fmtDay, fmtUnits, fmtUsdc, shortAddr, timeUntil } from "@/lib/format";
import { positionsSummary } from "@/lib/positions";

const C = COPY.app.book;

function Proof({ tx, entity }: { tx: string; entity: string }) {
  return (
    <span className="inline-flex flex-wrap gap-x-3 text-[13px]">
      <a className="text-ink underline underline-offset-4" href={txUrl(tx as `0x${string}`)} target="_blank" rel="noreferrer">
        Arc transaction
      </a>
      <a className="text-ink underline underline-offset-4" href={entity} target="_blank" rel="noreferrer">
        Arkiv entity
      </a>
    </span>
  );
}

export default function BookPage() {
  const book = useBook();
  const now = useNow(10_000);
  const [filter, setFilter] = useState<string>("all");
  const symbols = Array.from(new Set(book.data?.claims.map((c) => c.symbol) ?? []));
  const rows = (book.data?.claims ?? []).filter((c) => filter === "all" || c.symbol === filter);
  const sum = positionsSummary(rows);
  const discount = (c: (typeof rows)[number]) => c.baseBps + c.utilBps + c.timeBps + c.creditBps;
  const entity = (key: string) => `${book.data?.explorer}/entity/${key}`;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <AppHeader
        title={C.title}
        aside={
          book.data && symbols.length > 1 ? (
            <Segmented label="Fund" value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, ...symbols.map((s) => ({ value: s, label: s }))]} />
          ) : undefined
        }
      >
        {C.description}
      </AppHeader>

      {book.isPending && (
        <div className="flex justify-center py-10 text-muted">
          <Spinner />
        </div>
      )}
      {book.isError && <Notice tone="error">{(book.error as Error).message}</Notice>}

      {book.data && (
        <>
          <dl className="grid grid-cols-2 gap-px overflow-hidden border-y border-hairline bg-hairline sm:grid-cols-4">
            {(
              [
                ["Open claims", String(rows.length)],
                ["Paid for them", fmtUsdc(sum.cost)],
                ["Worth at payout", fmtUsdc(sum.expected, true)],
                ["Still to be earned", fmtUsdc(sum.profit, true)],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="bg-canvas px-4 py-4">
                <dt className="t-label min-h-8">{k}</dt>
                <dd className="t-figure mt-1.5 text-[1.375rem] leading-none">{v}</dd>
              </div>
            ))}
          </dl>

          {rows.length === 0 && <EmptyState art="claims" title={C.empty} action={{ href: "/sell", label: "Sell a redemption" }} />}

          {rows.length > 0 && (
            <section aria-label="Payout timeline">
              <div className="t-label mb-3">When they pay out</div>
              <ClaimsTimeline claims={rows} now={now} />
            </section>
          )}

          {rows.length > 0 && (
            <section aria-label="Every open payout">
              <div className="t-label mb-3">Every open payout</div>
              {/* Phones: one entry per payout instead of a wide table. */}
              <ul className="border-y border-ink sm:hidden">
                {rows.map((c) => (
                  <li key={c.key} className="border-b border-hairline py-3 last:border-b-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2">
                        <FundMark symbol={c.symbol} size={22} />
                        <span className="font-medium text-ink">{c.symbol}</span>
                      </span>
                      <span className="num text-ink">{fmtUsdc(BigInt(c.usdcPaid), true)}</span>
                    </div>
                    <div className="mt-1 flex justify-between gap-3 text-[13px] text-ink-2">
                      <span className="num">
                        {fmtUnits(BigInt(c.amount))} units · {fmtBps(discount(c))} discount
                      </span>
                      <span className="num whitespace-nowrap">pays in {timeUntil(c.settleAt, now)}</span>
                    </div>
                    <div className="mt-1.5">
                      <Proof tx={c.txHash} entity={entity(c.key)} />
                    </div>
                  </li>
                ))}
              </ul>
              <div className="relative hidden overflow-x-auto border-y border-ink sm:block">
                <table className="tbl min-w-[860px]" aria-label="Every open payout">
                  <thead>
                    <tr>
                      <th>Fund</th>
                      <th className="r">Units</th>
                      <th className="r">Paid</th>
                      <th className="r">Discount</th>
                      <th>Sold</th>
                      <th>Pays</th>
                      <th>Held by</th>
                      <th>Proof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr key={c.key}>
                        <td>
                          <span className="flex items-center gap-2">
                            <FundMark symbol={c.symbol} size={22} />
                            <span className="font-medium text-ink">{c.symbol}</span>
                          </span>
                        </td>
                        <td className="num r">{fmtUnits(BigInt(c.amount))}</td>
                        <td className="num r">{fmtUsdc(BigInt(c.usdcPaid), true)}</td>
                        <td className="num r">{fmtBps(discount(c))}</td>
                        <td className="num text-ink-2">{fmtDay(c.soldAt)}</td>
                        <td className="num">
                          {fmtDay(c.settleAt)} <span className="text-muted">· in {timeUntil(c.settleAt, now)}</span>
                        </td>
                        <td className="num text-muted">{shortAddr(c.holder)}</td>
                        <td>
                          <Proof tx={c.txHash} entity={entity(c.key)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="t-caption">
              Written to Arkiv Rabdi by {book.data.writer ? <span className="t-mono break-all">{book.data.writer}</span> : "the Earlyout writer wallet"}. Every entry disappears by itself on its payout day.
            </p>
            <Link href="/buy" className="text-[14px] font-medium text-ink underline underline-offset-4">
              {C.buyLink}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
