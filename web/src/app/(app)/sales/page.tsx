"use client";

import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/art/EmptyState";
import { FundMark } from "@/components/brand/FundMark";
import { WalletWelcome } from "@/components/app/WalletWelcome";
import { Notice, Spinner } from "@/components/ui/primitives";
import { errorMessage, useWallet } from "@/hooks/useEarlyout";
import { useNow } from "@/hooks/useNow";
import { useSales } from "@/hooks/useSales";
import { txUrl } from "@/lib/chain";
import { COPY } from "@/lib/copy";
import { fmtBps, fmtDay, fmtUnits, fmtUsdc, timeUntil } from "@/lib/format";
import type { SaleRow } from "@/lib/salesRows";

const C = COPY.app.sales;

function Status({ s, now }: { s: SaleRow; now: number }) {
  return s.status === "paid" ? (
    <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-buy">{C.paid}</span>
  ) : (
    <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-2" title={`Pays in ${timeUntil(s.settleAt, now)}`}>
      {C.waiting}
    </span>
  );
}

export default function SalesPage() {
  const wallet = useWallet();
  const sales = useSales();
  const now = useNow();
  const rows = sales.data ?? [];
  const received = rows.reduce((a, s) => a + BigInt(s.usdcPaid), 0n);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <AppHeader title={C.title}>{C.description}</AppHeader>

      {!wallet.isConnected && (
        <div className="max-w-md">
          <WalletWelcome screen="sell" />
          <p className="t-caption mt-3">{C.disconnected}</p>
        </div>
      )}
      {wallet.isConnected && sales.isPending && (
        <div className="flex justify-center py-10 text-muted">
          <Spinner />
        </div>
      )}
      {sales.isError && <Notice tone="error">{errorMessage(sales.error)}</Notice>}
      {sales.data && rows.length === 0 && <EmptyState art="sales" title={C.empty} action={{ href: "/sell", label: C.emptyCta }} />}

      {rows.length > 0 && (
        <>
          <dl className="grid grid-cols-2 gap-px overflow-hidden border-y border-hairline bg-hairline sm:max-w-xl">
            <div className="bg-canvas px-4 py-4">
              <dt className="t-label">Sales</dt>
              <dd className="t-figure mt-1.5 text-[1.5rem] leading-none">{rows.length}</dd>
            </div>
            <div className="bg-canvas px-4 py-4">
              <dt className="t-label">USDC received</dt>
              <dd className="t-figure mt-1.5 text-[1.5rem] leading-none">{fmtUsdc(received, true)}</dd>
            </div>
          </dl>

          <ul className="border-y border-ink sm:hidden">
            {rows.map((s) => (
              <li key={s.txHash} className="border-b border-hairline py-3 last:border-b-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <FundMark symbol={s.symbol} size={22} />
                    <span className="font-medium text-ink">{s.symbol}</span>
                  </span>
                  <span className="num text-ink">{fmtUsdc(BigInt(s.usdcPaid), true)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3 text-[13px] text-ink-2">
                  <span>Pays {fmtDay(s.settleAt)}</span>
                  <Status s={s} now={now} />
                </div>
                <a className="mt-1 inline-block text-[13px] text-ink underline underline-offset-4" href={txUrl(s.txHash as `0x${string}`)} target="_blank" rel="noreferrer">
                  Transaction
                </a>
              </li>
            ))}
          </ul>

          <div className="relative hidden overflow-x-auto border-y border-ink sm:block">
            <table className="tbl min-w-[760px]" aria-label="Your sales">
              <thead>
                <tr>
                  <th>Fund</th>
                  <th className="r">Amount</th>
                  <th className="r">USDC received</th>
                  <th className="r">Discount</th>
                  <th>Sold</th>
                  <th>Pays</th>
                  <th>Status</th>
                  <th>Transaction</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.txHash}>
                    <td>
                      <span className="flex items-center gap-2">
                        <FundMark symbol={s.symbol} size={22} />
                        <span className="font-medium text-ink">{s.symbol}</span>
                      </span>
                    </td>
                    <td className="num r">{fmtUnits(BigInt(s.amount))}</td>
                    <td className="num r">{fmtUsdc(BigInt(s.usdcPaid), true)}</td>
                    <td className="num r">{fmtBps(s.spreadBps)}</td>
                    <td className="num text-ink-2">{fmtDay(s.soldAt)}</td>
                    <td className="num">{fmtDay(s.settleAt)}</td>
                    <td>
                      <Status s={s} now={now} />
                    </td>
                    <td>
                      <a className="text-[13px] text-ink underline underline-offset-4" href={txUrl(s.txHash as `0x${string}`)} target="_blank" rel="noreferrer">
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
