"use client";

import { useMemo, useState } from "react";
import { AmountInput } from "@/components/AmountInput";
import { Button, Notice, Panel, Segmented, Spinner } from "@/components/ui/primitives";
import { Allocation } from "@/components/viz/Allocation";
import { Meter } from "@/components/viz/Meter";
import { Ring } from "@/components/viz/Ring";
import { isScheduled } from "@/lib/glossary";
import { AppHeader } from "@/components/AppHeader";
import { errorMessage, useAccountState, useDeposit, useFunds, useVault, useWallet, useWithdraw } from "@/hooks/useEarlyout";
import { useBook } from "@/hooks/useBook";
import { addresses } from "@/lib/addresses";
import { fmtDate, fmtUnits, fmtUsdc, parseUnitsSafe } from "@/lib/format";

function Figure({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: string }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <div className="t-eyebrow">{label}</div>
      <div className={`num mt-1 text-lg font-semibold ${tone ?? ""}`}>{value}</div>
      {note && <div className="t-caption mt-0.5">{note}</div>}
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
  const max = mode === "deposit" ? account.data?.usdc : account.data?.maxWithdraw;
  const over = amount !== null && max !== undefined && amount > max;
  const can = amount !== null && amount > 0n && !over && wallet.isConnected && !busy && !paused;
  const err = deposit.error ?? withdraw.error;

  async function go() {
    if (amount === null) return;
    if (mode === "deposit") await deposit.mutateAsync(amount);
    else await withdraw.mutateAsync(amount);
    setText("");
  }

  const v = vault.data;
  const util = v && v.totalAssets > 0n ? Number((v.deployed * 10000n) / v.totalAssets) / 100 : 0;
  const positions = (book.data?.claims ?? []).filter((c) => !addresses.vault || c.holder.toLowerCase() === addresses.vault.toLowerCase() || book.data?.source === "mock");

  return (
    <div className="grid gap-4">
      <AppHeader title="Vault">
        Provide USDC and earn the spread on every claim the vault buys. Claims are held at cost until they pay; withdrawals come from idle USDC.
      </AppHeader>

      {vault.isPending && (
        <div className="flex justify-center py-10 text-muted">
          <Spinner />
        </div>
      )}
      {vault.isError && <Notice tone="error">Could not load the vault: {errorMessage(vault.error)}</Notice>}

      {v && (
        <section className="card grid grid-cols-2 divide-hairline overflow-hidden sm:grid-cols-5 sm:divide-x [&>*]:border-b [&>*]:border-hairline sm:[&>*]:border-b-0">
          <Figure label="Share price" value={fmtUsdc(v.sharePrice, true)} note="USDC per share" />
          <Figure label="Total assets" value={fmtUsdc(v.totalAssets)} />
          <Figure label="Idle USDC" value={fmtUsdc(v.idle)} note="Available to buy claims" />
          <Figure label="In claims" value={fmtUsdc(v.deployed)} note="At cost" />
          <Figure label="Utilisation" value={`${util.toFixed(1)}%`} note="Raises the usage term" />
        </section>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 gap-4">
          <Panel title="Positions" note="Claims the vault holds, from the Arkiv book">
            <div className="overflow-x-auto">
              <table className="tbl min-w-[560px]">
                <thead>
                  <tr>
                    <th>Fund</th>
                    <th className="r">Units</th>
                    <th className="r">Cost</th>
                    <th className="r">Spread</th>
                    <th>Pays</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((c) => (
                    <tr key={c.key}>
                      <td className="font-semibold">{c.symbol}</td>
                      <td className="num r">{fmtUnits(BigInt(c.amount))}</td>
                      <td className="num r">{fmtUsdc(BigInt(c.usdcPaid), true)}</td>
                      <td className="num r">{((c.baseBps + c.utilBps + c.timeBps + c.creditBps) / 100).toFixed(2)}%</td>
                      <td className="num">{fmtDate(c.settleAt)}</td>
                      <td>
                        <span className="badge bg-buy-soft text-buy">
                          <span className="badge-dot" />
                          Performing
                        </span>
                      </td>
                    </tr>
                  ))}
                  {positions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted">
                        {book.isPending ? "Reading the book" : "No open positions"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
          {v && funds.data && (
            <Panel title="Allocation and exposure" bodyClassName="grid gap-6 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
              <div className="flex items-center gap-5">
                <Ring value={Number(v.deployed)} max={Number(v.idle + v.deployed)} size={112} stroke={13} color="var(--color-accent)" label={`Deployed ${util.toFixed(1)}% of the vault`}>
                  <span>
                    <span className="num block text-[22px] font-bold leading-none">{util.toFixed(1)}%</span>
                    <span className="t-caption">deployed</span>
                  </span>
                </Ring>
                <Allocation idle={v.idle} deployed={v.deployed} className="min-w-0" />
              </div>
              <div className="grid gap-4 sm:border-l sm:border-hairline sm:pl-6">
                {funds.data
                  .filter((f) => isScheduled(f.symbol))
                  .map((f) => (
                    <Meter key={f.address} value={Number(f.deployedUsdc)} max={Number(f.capUsdc)} label={`${f.symbol} exposure against its cap`} valueText={`${fmtUsdc(f.deployedUsdc)} of ${fmtUsdc(f.capUsdc)}`} />
                  ))}
                <p className="t-caption">The vault only buys funds that redeem on a schedule. Daily-liquidity funds are priced for comparison and never held.</p>
              </div>
            </Panel>
          )}
        </div>

        <Panel title="Liquidity ticket" bodyClassName="grid gap-4 p-4">
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
          {account.data && (
            <dl className="grid gap-1 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">Your shares are worth</dt>
                <dd className="num">{fmtUsdc(account.data.sharesValue)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Withdrawable now</dt>
                <dd className="num">{fmtUsdc(account.data.maxWithdraw)}</dd>
              </div>
            </dl>
          )}
          <AmountInput value={text} onChange={setText} unit="USDC" decimals={6} balance={max} label={mode === "deposit" ? "Deposit" : "Withdraw"} />
          {paused && (
            <Notice tone="warn">
              Liquidity provider (LP) {mode === "deposit" ? "deposits" : "withdrawals"} are paused until the fund writedown is marked on the Risk screen.
            </Notice>
          )}
          {over && <Notice tone="warn">{mode === "deposit" ? "More USDC than you hold." : "More than can be withdrawn right now."}</Notice>}
          {err && <Notice tone="error">{errorMessage(err)}</Notice>}
          <Button size="lg" className="w-full" onClick={go} disabled={!can} loading={busy}>
            {!wallet.isConnected ? "Connect a wallet" : mode === "deposit" ? "Deposit USDC" : "Withdraw USDC"}
          </Button>
          <p className="t-caption">Withdrawals are limited to idle USDC and pause while an issuer failure is unmarked.</p>
        </Panel>
      </div>
    </div>
  );
}
