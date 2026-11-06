"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, Notice, Segmented, Spinner } from "@/components/ui";
import { useNow } from "@/hooks/useNow";
import { txUrl } from "@/lib/chain";
import { fmtBps, fmtDate, fmtNav, fmtUnits, fmtUsdc, shortAddr, timeUntil } from "@/lib/format";
import type { BookClaim } from "@/server/arkiv/read";

type Book = { claims: BookClaim[]; writer: string | null; explorer: string; source: string };

async function fetchBook(): Promise<Book> {
  const res = await fetch("/api/book");
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Could not read the book");
  return body;
}

export default function BookPage() {
  const book = useQuery({ queryKey: ["book"], queryFn: fetchBook, refetchInterval: 10_000 });
  const now = useNow(10_000);
  const [filter, setFilter] = useState<string>("all");
  const symbols = Array.from(new Set(book.data?.claims.map((c) => c.symbol) ?? []));
  const rows = (book.data?.claims ?? []).filter((c) => filter === "all" || c.symbol === filter);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="t-display">Book</h1>
        <p className="t-body mt-2 text-muted">
          Every open claim, with its price and the four reasons behind it. Read from Arkiv, so it exists without our server, and each entry expires on its payout date.
        </p>
      </header>

      {book.isPending && (
        <div className="flex justify-center py-10">
          <Spinner className="text-muted" />
        </div>
      )}
      {book.isError && <Notice tone="error">{(book.error as Error).message}</Notice>}

      {book.data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              label="Fund"
              value={filter}
              onChange={setFilter}
              options={[{ value: "all", label: "All" }, ...symbols.map((s) => ({ value: s, label: s }))]}
            />
            <span className="t-caption tnum">
              {rows.length} open · {fmtUsdc(rows.reduce((a, c) => a + BigInt(c.usdcPaid), 0n))} deployed
            </span>
          </div>

          {rows.length === 0 && (
            <Card>
              <Notice>No open claims yet. Sell one and it appears here within seconds.</Notice>
            </Card>
          )}

          <ul className="space-y-3">
            {rows.map((c) => {
              const spread = c.baseBps + c.utilBps + c.timeBps + c.creditBps;
              return (
                <li key={c.key}>
                  <Card>
                    <div className="flex items-baseline justify-between gap-3">
                      <div>
                        <div className="t-headline">
                          {fmtUnits(BigInt(c.amount))} {c.symbol}
                        </div>
                        <div className="t-caption tnum">
                          Pays {fmtDate(c.settleAt)} · in {timeUntil(c.settleAt, now)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="t-title tnum">{fmtUsdc(BigInt(c.usdcPaid))}</div>
                        <div className="t-caption tnum">at NAV {fmtNav(BigInt(c.nav))}, {fmtBps(spread)} spread</div>
                      </div>
                    </div>
                    <div className="t-caption tnum mt-3 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Base {fmtBps(c.baseBps)}</span>
                      <span>Usage {fmtBps(c.utilBps)}</span>
                      <span>Time {fmtBps(c.timeBps)}</span>
                      <span>Credit {fmtBps(c.creditBps)}</span>
                    </div>
                    <div className="t-caption mt-3 flex flex-wrap gap-x-4 gap-y-1">
                      <a className="text-accent" href={txUrl(c.txHash)} target="_blank" rel="noreferrer">
                        Arc transaction
                      </a>
                      <a className="text-accent" href={`${book.data.explorer}/entity/${c.key}`} target="_blank" rel="noreferrer">
                        Arkiv entity
                      </a>
                      <span>Seller {shortAddr(c.seller)}</span>
                      <span>Held by {shortAddr(c.holder)}</span>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>

          <p className="t-caption">
            Written to Arkiv Rabdi by {book.data.writer ? <span className="t-mono">{book.data.writer}</span> : "the Earlyout writer wallet"}. Entries expire at their payout date; nothing of ours deletes them.
          </p>
        </>
      )}
    </div>
  );
}
