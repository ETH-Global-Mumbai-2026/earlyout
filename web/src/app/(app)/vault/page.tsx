"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AmountInput } from "@/components/AmountInput";
import { TestTokens } from "@/components/app/TestTokens";
import { WalletWelcome } from "@/components/app/WalletWelcome";
import { Button, Notice, Segmented, Spinner } from "@/components/ui/primitives";
import { TermSheet } from "@/components/ui/TermSheet";
import { Allocation } from "@/components/viz/Allocation";
import { Meter } from "@/components/viz/Meter";
import { isScheduled } from "@/lib/glossary";
import { AppHeader } from "@/components/AppHeader";
import { errorMessage, useAccountState, useDeposit, useFunds, useVault, useWallet, useWithdraw } from "@/hooks/useEarlyout";
import { useBook } from "@/hooks/useBook";
import { addresses } from "@/lib/addresses";
import { COPY } from "@/lib/copy";
import { fmtBps, fmtUsdc, parseUnitsSafe } from "@/lib/format";
import { positionsSummary } from "@/lib/positions";

const C = COPY.app.vault;
const GAS_RESERVE = 100_000n; // 0.10 USDC at 6 decimals

function Figure({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: string }) {
  return (
    <div className="min-w-0 bg-canvas px-4 py-4">
      <dt className="t-label min-h-8">{label}</dt>
      <dd className={`t-figure mt-1.5 text-[1.5rem] leading-none ${tone ?? ""}`}>{value}</dd>
      {note && <dd className="t-caption mt-1">{note}</dd>}
    </div>
  );
}

export default function VaultPage() {
  const vault = useVault();
  const funds = useFunds();
  const book = useBook();
  const account = useAccountState();
  const wallet = useWallet();
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [text, setText] = useState("");
  const deposit = useDeposit();
  const withdraw = useWithdraw();
  const amount = useMemo(() => parseUnitsSafe(text, 6), [text]);
  const busy = deposit.isPending || withdraw.isPending;
  const paused =
    mode === "deposit"
      ? account.data?.maxDeposit === 0n
      : account.data !== undefined && account.data.shares > 0n && account.data.maxWithdraw === 0n && account.data.sharesValue > 0n;
  // Arc pays gas in USDC, so Max on a deposit keeps a little back for the transaction itself.
  const usdcSpendable = account.data ? (account.data.usdc > GAS_RESERVE ? account.data.usdc - GAS_RESERVE : 0n) : undefined;
  const max = mode === "deposit" ? usdcSpendable : account.data?.maxWithdraw;
  const over = amount !== null && max !== undefined && amount > max;
  const can = amount !== null && amount > 0n && !over && wallet.isConnected && !busy && !paused;
  const err = deposit.error ?? withdraw.error;

  async function go() {
    if (amount === null) return;
    try {
      if (mode === "deposit") await deposit.mutateAsync(amount);
      else await withdraw.mutateAsync(amount);
      setText("");
    } catch {
      // Shown in the ticket through the mutation's error.
    }
  }

  const v = vault.data;
  const util = v && v.totalAssets > 0n ? Number((v.deployed * 10000n) / v.totalAssets) : 0;
  const held = (book.data?.claims ?? []).filter((c) => !addresses.vault || c.holder.toLowerCase() === addresses.vault.toLowerCase() || book.data?.source === "mock");
  const sum = positionsSummary(held);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <AppHeader title={C.title}>{C.description}</AppHeader>

      {vault.isPending && (
        <div className="flex justify-center py-10 text-muted">
          <Spinner />
        </div>
      )}
      {vault.isError && <Notice tone="error">Could not load the pool: {errorMessage(vault.error)}</Notice>}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8 lg:col-start-1">
          {v && (
            <section aria-label="The pool">
              <div className="t-label mb-3">The pool right now</div>
              <dl className="grid grid-cols-2 gap-px overflow-hidden border-y border-hairline bg-hairline sm:grid-cols-3">
                <Figure label="Share price" value={fmtUsdc(v.sharePrice, true)} note="What one share is worth" />
                <Figure label="Pool size" value={fmtUsdc(v.totalAssets)} />
                <Figure label="Spare cash" value={fmtUsdc(v.idle)} note="Ready to buy payouts" />
                <Figure label="In payouts" value={fmtUsdc(v.deployed)} note="What the pool paid" />
                <Figure label="In use" value={fmtBps(util)} note="Of the pool" />
                <Figure label={COPY.app.vault.toEarn} value={book.data ? fmtUsdc(sum.profit, true) : "…"} />
              </dl>
            </section>
          )}

          {v && funds.data && (
            <section aria-label="Where the money is">
              <div className="t-label mb-3">Where the money is</div>
              <Allocation idle={v.idle} deployed={v.deployed} />
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {funds.data
                  .filter((f) => f.capUsdc > 0n && isScheduled(f.symbol))
                  .map((f) => (
                    <Meter key={f.address} value={Number(f.deployedUsdc)} max={Number(f.capUsdc)} label={`${f.symbol}, used of its limit`} valueText={`${fmtUsdc(f.deployedUsdc)} of ${fmtUsdc(f.capUsdc)}`} />
                  ))}
              </div>
              <Link href="/positions" className="mt-6 inline-block text-[14px] text-ink underline underline-offset-4">
                See every payout the pool holds
              </Link>
            </section>
          )}
        </div>

        <div className="grid gap-4 lg:sticky lg:top-[100px] lg:col-start-2 lg:row-start-1">
          <WalletWelcome screen="vault" />
          <TermSheet raised header="Your money">
            <Segmented
              label="Action"
              value={mode}
              onChange={(m) => {
                setMode(m);
                setText("");
              }}
              options={[
                { value: "deposit", label: "Deposit" },
                { value: "withdraw", label: "Withdraw" },
              ]}
            />
            <dl className="mt-4 grid gap-0">
              <div className="rule-dashed flex justify-between py-2 text-[14px]">
                <dt className="text-ink-2">{C.worth}</dt>
                <dd className="num">{account.data ? fmtUsdc(account.data.sharesValue) : "…"}</dd>
              </div>
              <div className="rule-dashed flex justify-between py-2 text-[14px]">
                <dt className="text-ink-2">{C.withdrawable}</dt>
                <dd className="num">{account.data ? fmtUsdc(account.data.maxWithdraw) : "…"}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <AmountInput value={text} onChange={setText} unit="USDC" decimals={6} balance={max} label={mode === "deposit" ? "Deposit" : "Withdraw"} />
            </div>
            {paused && (
              <p className="mt-3 text-[13px] text-refuse">
                {mode === "deposit" ? "Deposits" : "Withdrawals"} are paused for a moment while a fund problem is being handled.
              </p>
            )}
            {over && <p className="mt-3 text-[13px] text-refuse">{mode === "deposit" ? "That is more USDC than you can deposit. Keep 0.10 USDC for fees." : "That is more than you can take out right now."}</p>}
            {err && <p className="mt-3 text-[13px] text-halt">{errorMessage(err)}</p>}
            <Button size="lg" className="mt-4 w-full" onClick={go} disabled={!can} loading={busy}>
              {!wallet.isConnected ? "Connect a wallet" : mode === "deposit" ? "Deposit USDC" : "Withdraw USDC"}
            </Button>
            <p className="t-caption mt-3">You can take out cash the pool is not using. Your share grows as payouts come in.</p>
          </TermSheet>
          <TestTokens need="deposit" />
        </div>
      </div>
    </div>
  );
}
