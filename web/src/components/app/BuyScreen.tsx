"use client";

import { useState } from "react";
import { TestTokens } from "./TestTokens";
import { WalletWelcome } from "./WalletWelcome";
import { EmptyState } from "../art/EmptyState";
import { FundMark } from "../brand/FundMark";
import { TermLine, TermSheet } from "../ui/TermSheet";
import { Button, Notice, Spinner } from "../ui/primitives";
import { useBook } from "@/hooks/useBook";
import { errorMessage, useAccountState, useBuy, useClaimPosition, useHoldings, useRedeem, useWallet } from "@/hooks/useEarlyout";
import { useNow } from "@/hooks/useNow";
import { addresses } from "@/lib/addresses";
import { txUrl } from "@/lib/chain";
import { COPY } from "@/lib/copy";
import { fmtBps, fmtDay, fmtUnits, fmtUsdc, timeUntil } from "@/lib/format";
import { expectedReturn } from "@/lib/metrics";
import type { ClaimPosition, Receipt } from "@/lib/types";
import { cn } from "@/lib/utils";

const C = COPY.app.buy;
/// Room for the price to rise between the quote and the block: the buy price
/// climbs toward the fund price as the payout date nears.
const MAX_COST_BPS = 50n;

type OpenClaim = { id: bigint; symbol: string; settleAt: number; units: bigint };

const COLS =
  "grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)] sm:grid-cols-[minmax(0,1.3fr)_repeat(5,minmax(0,1fr))] items-center gap-3";

/// Buy a whole claim the vault holds, then hold it until payout day and redeem
/// it for the full amount. Several sales into the same payout window share one
/// claim id, so the book's rows are grouped by claim.
export function BuyScreen() {
  const book = useBook();
  const now = useNow(10_000);
  const wallet = useWallet();
  const account = useAccountState().data;
  const holdings = useHoldings();
  const buy = useBuy();
  const redeem = useRedeem();
  const [picked, setPicked] = useState<bigint | null>(null);
  const [last, setLast] = useState<Receipt | null>(null);

  const mine = new Set((holdings.data ?? []).map((h) => h.claimId));
  const vault = addresses.vault?.toLowerCase();
  const grouped = new Map<bigint, OpenClaim>();
  for (const c of book.data?.claims ?? []) {
    if (c.status !== "open" || c.settleAt <= now) continue;
    if (book.data?.source !== "mock" && vault && c.holder.toLowerCase() !== vault) continue;
    const id = BigInt(c.claimId);
    if (mine.has(id)) continue;
    const g = grouped.get(id);
    if (g) g.units += BigInt(c.amount);
    else grouped.set(id, { id, symbol: c.symbol, settleAt: c.settleAt, units: BigInt(c.amount) });
  }
  const open = [...grouped.values()].sort((a, b) => a.settleAt - b.settleAt);
  const sel = open.find((c) => c.id === picked) ?? open[0];

  const pos = useClaimPosition(sel?.id, null);
  const p = pos.data && sel && pos.data.claimId === sel.id ? pos.data : undefined;
  const ret = p ? expectedReturn(p.price, p.value, p.settleAt - now) : null;
  // ClaimToken only moves claims to allowlisted wallets, so Vault.buy would
  // revert after the approval. Point those wallets at test tokens instead.
  const blocked = account?.claimAllowlisted === false;
  const can = !!p && p.verdict === "BUY" && p.held > 0n && wallet.isConnected && !blocked && !buy.isPending;

  function onBuy() {
    if (!p) return;
    const maxCost = p.price + (p.price * MAX_COST_BPS + 9_999n) / 10_000n;
    buy.mutate(
      { claimId: p.claimId, amount: p.held, maxCost },
      {
        onSuccess: (r) => {
          setLast(r);
          setPicked(null);
        },
      },
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10">
      {book.isPending && (
        <div className="flex justify-center py-10 text-muted">
          <Spinner />
        </div>
      )}
      {book.isError && <Notice tone="error">{errorMessage(book.error)}</Notice>}

      {book.data && (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section aria-label={C.choose} className="min-w-0">
            <h2 className="t-label mb-3">{C.choose}</h2>
            {open.length === 0 ? (
              <EmptyState art="claims" title={C.empty} />
            ) : (
              <>
                <div className={cn(COLS, "t-label border-b border-ink pb-2")}>
                  <span>Fund</span>
                  <span className="hidden text-right sm:block">Units</span>
                  <span className="text-right">Price</span>
                  <span className="hidden text-right sm:block">At payout</span>
                  <span className="hidden text-right sm:block">Return</span>
                  <span className="text-right">Pays</span>
                </div>
                <div role="radiogroup" aria-label="Claims for sale">
                  {open.map((c) => (
                    <ClaimRow key={c.id.toString()} c={c} active={c.id === sel?.id} now={now} onPick={() => setPicked(c.id)} />
                  ))}
                </div>
              </>
            )}
          </section>

          {sel && (
            <div className="grid gap-4 lg:sticky lg:top-[100px]">
              <WalletWelcome screen="buy" />
              <div role="region" aria-label={C.ticket}>
                <TermSheet raised header={`${C.ticket} · ${sel.symbol}`} stamp={p ? { verdict: p.verdict, reason: p.reason || undefined } : undefined}>
                  <TermLine label="Units" value={p ? fmtUnits(p.held) : "…"} hint="The whole claim" />
                  <TermLine label={C.worth} value={p ? fmtUsdc(p.value, true) : "…"} />
                  <TermLine label={C.price} value={p ? fmtUsdc(p.price, true) : "…"} tone="strong" />
                  <TermLine
                    label={C.gain}
                    value={ret ? `${fmtUsdc(ret.profit, true)} · ${fmtBps(ret.bps)}` : "…"}
                    hint={ret?.annualisedBps != null ? `${fmtBps(ret.annualisedBps)} a year` : undefined}
                  />
                  <TermLine label={C.pays} value={fmtDay(sel.settleAt)} hint={`in ${timeUntil(sel.settleAt, now)}`} />
                  {p && p.verdict !== "BUY" && p.reason && <p className="pt-2 text-[13px] text-ink-2">{p.reason}</p>}
                  <div className="mt-4">
                    <Button size="lg" className="w-full" onClick={onBuy} disabled={!can} loading={buy.isPending}>
                      {!wallet.isConnected
                        ? "Connect a wallet to buy"
                        : blocked
                          ? "Get test tokens first"
                          : p?.verdict === "BUY"
                            ? `Buy for ${fmtUsdc(p.price, p.price < 10_000n)}`
                            : "Buy"}
                    </Button>
                  </div>
                </TermSheet>
              </div>
              <TestTokens need="buy" allowlisted={account?.claimAllowlisted} />
              {buy.isError && <Notice tone="error">{errorMessage(buy.error)}</Notice>}
              {last && !buy.isPending && (
                <Notice tone="success">
                  {C.bought}{" "}
                  <a className="underline underline-offset-4" href={txUrl(last.hash)} target="_blank" rel="noreferrer">
                    View transaction
                  </a>
                </Notice>
              )}
              <p className="t-caption">{C.whole}</p>
            </div>
          )}
        </div>
      )}

      {wallet.isConnected && (
        <section aria-label={C.yours}>
          <h2 className="t-label mb-3">{C.yours}</h2>
          {holdings.isError && <Notice tone="error">{errorMessage(holdings.error)}</Notice>}
          {holdings.data && holdings.data.length === 0 && <p className="border-y border-hairline py-4 text-[14px] text-ink-2">{C.yoursEmpty}</p>}
          {holdings.data && holdings.data.length > 0 && (
            /* Phones: one entry per claim, with the Redeem button in reach. */
            <ul className="border-y border-ink sm:hidden">
              {holdings.data.map((h) => {
                const ready = h.collected || h.settleAt <= now;
                return (
                  <li key={h.claimId.toString()} className="flex items-center justify-between gap-3 border-b border-hairline py-3 last:border-b-0">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <FundMark symbol={h.symbol} size={22} />
                        <span className="font-medium text-ink">{h.symbol}</span>
                        <span className="num text-ink">{fmtUsdc(h.value, true)}</span>
                      </span>
                      <span className="num mt-1 block text-[13px] text-ink-2">
                        {fmtUnits(h.amount)} units · {ready ? "ready" : `pays in ${timeUntil(h.settleAt, now)}`}
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="shrink-0"
                      disabled={!ready || redeem.isPending}
                      loading={redeem.isPending && redeem.variables?.claimId === h.claimId}
                      onClick={() => redeem.mutate({ claimId: h.claimId, amount: h.amount })}
                    >
                      {C.redeem}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          {holdings.data && holdings.data.length > 0 && (
            <div className="relative hidden overflow-x-auto border-y border-ink sm:block">
              <table className="tbl min-w-[560px]" aria-label={C.yours}>
                <thead>
                  <tr>
                    <th>Fund</th>
                    <th className="r">Units</th>
                    <th className="r">At payout</th>
                    <th className="r">Pays</th>
                    <th className="r">
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.data.map((h) => {
                    const ready = h.collected || h.settleAt <= now;
                    const busy = redeem.isPending && redeem.variables?.claimId === h.claimId;
                    return (
                      <tr key={h.claimId.toString()}>
                        <td>
                          <span className="flex items-center gap-2">
                            <FundMark symbol={h.symbol} size={22} />
                            <span className="font-medium text-ink">{h.symbol}</span>
                          </span>
                        </td>
                        <td className="r num">{fmtUnits(h.amount)}</td>
                        <td className="r num">{fmtUsdc(h.value, true)}</td>
                        <td className="r">
                          <span className="num block">{fmtDay(h.settleAt)}</span>
                          <span className="block text-[12px] text-muted">{ready ? "Ready" : `in ${timeUntil(h.settleAt, now)}`}</span>
                        </td>
                        <td className="r">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!ready || redeem.isPending}
                            loading={busy}
                            title={ready ? undefined : C.redeemNote}
                            onClick={() => redeem.mutate({ claimId: h.claimId, amount: h.amount })}
                          >
                            {C.redeem}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {redeem.isError && (
            <div className="mt-3">
              <Notice tone="error">{errorMessage(redeem.error)}</Notice>
            </div>
          )}
          <p className="t-caption mt-2">{C.redeemNote}</p>
        </section>
      )}
    </div>
  );
}

/// One claim for sale. Prices itself from the vault (the same query the ticket
/// uses), and drops out once the vault no longer holds it.
function ClaimRow({ c, active, now, onPick }: { c: OpenClaim; active: boolean; now: number; onPick: () => void }) {
  const pos = useClaimPosition(c.id, null).data as ClaimPosition | undefined;
  if (pos && pos.held === 0n) return null;
  const units = pos?.held ?? c.units;
  const ret = pos ? expectedReturn(pos.price, pos.value, c.settleAt - now) : null;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={`${c.symbol} claim, ${fmtUnits(units)} units, pays ${fmtDay(c.settleAt)}`}
      onClick={onPick}
      className={cn(COLS, "relative w-full border-b border-hairline py-3 text-left transition-colors hover:bg-surface-2", active && "bg-surface")}
    >
      {active && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-ink" />}
      <span className="flex min-w-0 items-center gap-3 pl-3">
        <FundMark symbol={c.symbol} size={26} />
        <span className="truncate text-[15px] font-medium text-ink">{c.symbol}</span>
      </span>
      <span className="num hidden text-right text-[14px] text-ink-2 sm:block">{fmtUnits(units)}</span>
      <span className="num text-right text-[14px] text-ink">{pos ? fmtUsdc(pos.price, true) : "…"}</span>
      <span className="num hidden text-right text-[14px] text-ink-2 sm:block">{pos ? fmtUsdc(pos.value, true) : "…"}</span>
      <span className="num hidden text-right text-[14px] text-buy sm:block">{ret ? fmtBps(ret.bps) : "…"}</span>
      <span className="text-right">
        <span className="num block text-[14px] text-ink-2">{fmtDay(c.settleAt)}</span>
        <span className="block text-[12px] text-muted">in {timeUntil(c.settleAt, now)}</span>
      </span>
    </button>
  );
}
