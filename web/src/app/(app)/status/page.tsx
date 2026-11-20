"use client";

import { AppHeader } from "@/components/AppHeader";
import { useOperator } from "@/components/app/DemoGate";
import { FundMark } from "@/components/brand/FundMark";
import { Button, Notice, Spinner } from "@/components/ui/primitives";
import { TermSheet } from "@/components/ui/TermSheet";
import { errorMessage, useFunds, useIssuerFailed, useMarkImpaired, usePushNav, useSetIssuerFailed, useWallet } from "@/hooks/useEarlyout";
import { useNow } from "@/hooks/useNow";
import { MODE } from "@/lib/addresses";
import { COPY } from "@/lib/copy";
import { fmtDate, fmtDuration, fmtNav, timeAgo } from "@/lib/format";
import { isScheduled } from "@/lib/glossary";
import type { Fund } from "@/lib/types";

const C = COPY.app.status;

function health(f: Fund, now: number): { label: string; cls: string } {
  if (f.impaired) return { label: "Marked down", cls: "text-halt" };
  if (f.status === 1) return { label: "Problem reported", cls: "text-halt" };
  if (now - f.navUpdatedAt > f.maxAge) return { label: "Price out of date", cls: "text-refuse" };
  return { label: "Healthy", cls: "text-buy" };
}

export default function StatusPage() {
  const funds = useFunds();
  const failed = useIssuerFailed();
  const setFailed = useSetIssuerFailed();
  const impair = useMarkImpaired();
  const wallet = useWallet();
  const pushNav = usePushNav();
  const op = useOperator();
  const now = useNow();
  const list = funds.data ?? [];
  const sellable = list.filter((f) => isScheduled(f.symbol));
  const daily = list.filter((f) => !isScheduled(f.symbol));
  const problems = list.filter((f) => f.status === 1 && !f.impaired);

  const row = (f: Fund) => {
    const h = health(f, now);
    const age = Math.max(0, now - f.navUpdatedAt);
    const used = Math.min(1, age / Math.max(1, f.maxAge));
    return (
      <tr key={f.address}>
        <td>
          <span className="flex items-center gap-2">
            <FundMark symbol={f.symbol} size={22} />
            <span className="font-medium text-ink">{f.symbol}</span>
          </span>
        </td>
        <td className="num r">{fmtNav(f.nav)}</td>
        <td>
          <span className="num block" title={fmtDate(f.navUpdatedAt)}>
            {timeAgo(f.navUpdatedAt, now)}
          </span>
          <span className="mt-1 block h-1 w-24 overflow-hidden rounded-full bg-viz-track" aria-hidden>
            <span className={`block h-full ${used > 0.8 ? "bg-refuse" : "bg-brand"}`} style={{ width: `${used * 100}%` }} />
          </span>
        </td>
        <td className="num text-ink-2">{fmtDuration(f.maxAge)}</td>
        <td className={`font-mono text-[11px] uppercase tracking-[0.06em] ${h.cls}`}>{h.label}</td>
      </tr>
    );
  };

  const table = (label: string, rows: Fund[]) => (
    <div className="relative overflow-x-auto border-y border-ink">
      <table className="tbl min-w-[560px]" aria-label={label}>
        <thead>
          <tr>
            <th>Fund</th>
            <th className="r">Price</th>
            <th>Updated</th>
            <th>Pauses after</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>{rows.map(row)}</tbody>
      </table>
    </div>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <AppHeader title={C.title}>{C.description}</AppHeader>

      {funds.isPending && (
        <div className="flex justify-center py-10 text-muted">
          <Spinner />
        </div>
      )}
      {funds.isError && <Notice tone="error">{errorMessage(funds.error)}</Notice>}

      {problems.map((f) => (
        <div key={f.address} className="flex flex-wrap items-center justify-between gap-3 border-y border-halt/40 bg-halt-soft px-4 py-3">
          <span className="text-[14px] text-ink">
            <strong>{f.symbol}</strong> reports a problem. Selling is paused. Anyone can mark its payouts down now, so everyone in the pool shares the loss fairly.
          </span>
          <Button variant="danger" size="sm" className="shrink-0" onClick={() => impair.mutate(f.address)} loading={impair.isPending} disabled={!wallet.isConnected}>
            Mark impaired
          </Button>
        </div>
      ))}
      {impair.isError && <Notice tone="error">{errorMessage(impair.error)}</Notice>}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8">
          {sellable.length > 0 && (
            <section aria-label="Funds you can sell">
              <div className="t-label mb-3">Funds you can sell</div>
              {table("Funds you can sell", sellable)}
            </section>
          )}
          {daily.length > 0 && (
            <section aria-label="Daily-liquidity funds" className="opacity-85">
              <div className="t-label mb-3">Daily-liquidity funds, for comparison</div>
              {table("Daily-liquidity funds", daily)}
            </section>
          )}
          <p className="t-caption">Prices come from each fund&apos;s official Chainlink feed. If a price is not updated in time, selling that fund pauses until it is.</p>
        </div>

        {op.enabled && (
          <TermSheet header={C.demo} aside="Testnet">
            <p className="py-2 text-[13px] text-ink-2">{C.demoNote}</p>
            <div className="rule-dashed flex items-center justify-between gap-3 py-3">
              <span className="text-[14px]">
                Issuer status: <strong>{failed.data === undefined ? "…" : failed.data ? "FAILED" : "OK"}</strong>
              </span>
              <Button variant={failed.data ? "secondary" : "danger"} size="sm" onClick={() => setFailed.mutate(!failed.data)} loading={setFailed.isPending} disabled={failed.data === undefined}>
                {failed.data ? "Restore issuer" : "Simulate issuer failure"}
              </Button>
            </div>
            {setFailed.isError && <p className="text-[13px] text-halt">{errorMessage(setFailed.error)}</p>}
            {MODE === "chain" && (
              <div className="flex items-center justify-between gap-3 py-3">
                <span className="text-[13px] text-ink-2">Send the latest prices and issuer status on chain now.</span>
                <Button variant="secondary" size="sm" className="shrink-0" onClick={() => pushNav.mutate()} loading={pushNav.isPending}>
                  Push NAV
                </Button>
              </div>
            )}
            {pushNav.isError && <p className="text-[13px] text-halt">{errorMessage(pushNav.error)}</p>}
          </TermSheet>
        )}
      </div>
    </div>
  );
}
