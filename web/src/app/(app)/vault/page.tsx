"use client";

import { useMemo, useState } from "react";
import { AmountInput } from "@/components/AmountInput";
import { Button, Card, Notice, Segmented, Spinner, Stat } from "@/components/ui/primitives";
import { errorMessage, useAccountState, useDeposit, useVault, useWallet, useWithdraw } from "@/hooks/useEarlyout";
import { fmtUsdc, parseUnitsSafe } from "@/lib/format";

export default function VaultPage() {
  const vault = useVault();
  const account = useAccountState();
  const wallet = useWallet();
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [text, setText] = useState("");
  const deposit = useDeposit();
  const withdraw = useWithdraw();
  const amount = useMemo(() => parseUnitsSafe(text, 6), [text]);
  const busy = deposit.isPending || withdraw.isPending;
  const paused = mode === "deposit" ? account.data?.maxDeposit === 0n : account.data !== undefined && account.data.shares > 0n && account.data.maxWithdraw === 0n && account.data.sharesValue > 0n;
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
  const pct = v && v.totalAssets > 0n ? Number((v.deployed * 1000n) / v.totalAssets) / 10 : 0;

  return (
    <div className="space-y-5">
      <header>
        <div className="t-eyebrow">03 · Vault</div>
        <h1 className="t-display mt-2">Vault</h1>
        <p className="t-body mt-2 text-muted">LPs fund the vault in USDC and earn the spread. Claims are held at cost until they pay.</p>
      </header>

      {vault.isPending && (
        <div className="flex justify-center py-10">
          <Spinner className="text-muted" />
        </div>
      )}
      {vault.isError && <Notice tone="error">Could not load the vault: {errorMessage(vault.error)}</Notice>}

      {v && (
        <Card className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Stat label="Share price" value={fmtUsdc(v.sharePrice, true)} hint="USDC per share" />
          <Stat label="Total assets" value={fmtUsdc(v.totalAssets)} />
          <Stat label="Idle USDC" value={fmtUsdc(v.idle)} hint="Available to buy claims" />
          <Stat label="In claims" value={fmtUsdc(v.deployed)} hint={`${pct}% deployed`} />
        </Card>
      )}

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="t-headline">Your position</h2>
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
        </div>
        {account.data && (
          <div className="grid grid-cols-2 gap-5">
            <Stat label="Your shares are worth" value={fmtUsdc(account.data.sharesValue)} />
            <Stat label="Withdrawable now" value={fmtUsdc(account.data.maxWithdraw)} hint="Limited to idle USDC" />
          </div>
        )}
        <AmountInput value={text} onChange={setText} unit="USDC" decimals={6} balance={max} label={mode === "deposit" ? "Deposit" : "Withdraw"} />
        {paused && (
          <Notice tone="warn">
            LP {mode === "deposit" ? "deposits" : "withdrawals"} are paused until the fund writedown is marked on the Status screen. This stops anyone trading ahead of it.
          </Notice>
        )}
        {over && <Notice tone="warn">{mode === "deposit" ? "More USDC than you hold." : "More than can be withdrawn right now."}</Notice>}
        {err && <Notice tone="error">{errorMessage(err)}</Notice>}
        <Button size="lg" className="w-full" onClick={go} disabled={!can} loading={busy}>
          {!wallet.isConnected ? "Connect a wallet" : mode === "deposit" ? "Deposit USDC" : "Withdraw USDC"}
        </Button>
      </Card>
    </div>
  );
}
