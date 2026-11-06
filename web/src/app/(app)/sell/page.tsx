"use client";

import { useMemo, useState } from "react";
import { AmountInput } from "@/components/AmountInput";
import { FundPicker } from "@/components/FundPicker";
import { QuoteCard } from "@/components/QuoteCard";
import { Button, Notice, Sheet, Spinner } from "@/components/ui/primitives";
import { errorMessage, useAccountState, useFunds, useQuote, useSell, useTryAsJudge, useWallet } from "@/hooks/useEarlyout";
import { MODE } from "@/lib/addresses";
import { fmtUsdc, parseUnitsSafe } from "@/lib/format";
import { txUrl } from "@/lib/chain";
import type { Fund, Receipt } from "@/lib/types";

export default function SellPage() {
  const funds = useFunds();
  const wallet = useWallet();
  const account = useAccountState();
  const [selected, setFund] = useState<Fund>();
  const fund = selected ?? funds.data?.[0];
  const [amountText, setAmountText] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const sell = useSell();
  const judge = useTryAsJudge();
  const holdsNothing = MODE === "chain" && wallet.isConnected && !!account.data && Object.values(account.data.fundBalances).every((b) => b === 0n);

  const amount = useMemo(() => parseUnitsSafe(amountText, 18), [amountText]);
  const quote = useQuote(fund?.address, amount && amount > 0n ? amount : null);
  const balance = fund && account.data ? account.data.fundBalances[fund.address] : undefined;
  const overBalance = amount !== null && balance !== undefined && amount > balance;
  const q = quote.data;
  const canSell = !!fund && !!q && q.verdict === "BUY" && amount !== null && amount > 0n && wallet.isConnected && !overBalance && !sell.isPending;

  async function onSell() {
    if (!fund || !q || amount === null) return;
    const minPayout = (q.payout * 995n) / 1000n; // 0.5% price move tolerated
    const r = await sell.mutateAsync({ fund: fund.address, amount, minPayout });
    setReceipt(r);
    setAmountText("");
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="t-eyebrow">01 · Sell</div>
        <h1 className="t-display mt-2">Sell your pending redemption</h1>
        <p className="t-body mt-2 text-muted">
          Pick a fund and an amount. You see the verdict and the price before anything moves. USDC arrives in the same transaction.
        </p>
      </header>

      {funds.isPending && (
        <div className="flex justify-center py-10">
          <Spinner className="text-muted" />
        </div>
      )}
      {funds.isError && <Notice tone="error">Could not load funds: {errorMessage(funds.error)}</Notice>}

      {funds.data && (
        <>
          {holdsNothing && (
            <Notice tone="info">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>This wallet holds no fund tokens. Get demo units of each fund, allowlisted, plus a little USDC for gas.</span>
                <Button size="sm" variant="secondary" onClick={() => wallet.address && judge.mutate(wallet.address)} loading={judge.isPending}>
                  Try as judge
                </Button>
              </div>
              {judge.isError && <div className="t-caption mt-2 text-halt">{errorMessage(judge.error)}</div>}
            </Notice>
          )}

          <FundPicker funds={funds.data} value={fund?.address} onChange={setFund} />

          <AmountInput value={amountText} onChange={setAmountText} unit={fund?.symbol ?? ""} balance={balance} />
          {overBalance && <Notice tone="warn">That is more than you hold.</Notice>}

          <QuoteCard quote={q} pending={quote.isFetching} symbol={fund?.symbol ?? ""} />

          {sell.isError && <Notice tone="error">{errorMessage(sell.error)}</Notice>}

          <Button size="lg" className="w-full" onClick={onSell} disabled={!canSell} loading={sell.isPending}>
            {!wallet.isConnected ? "Connect a wallet to sell" : q?.verdict === "BUY" ? `Sell for ${fmtUsdc(q.payout)}` : "Sell"}
          </Button>
          <p className="t-caption text-center">
            Your fund tokens join the issuer redemption queue. The claim goes to the vault. You keep the USDC.
          </p>
        </>
      )}

      <Sheet open={!!receipt} onClose={() => setReceipt(null)} title="Sold">
        {receipt && (
          <div className="space-y-3">
            <div>
              <div className="t-caption">USDC received</div>
              <div className="t-display tnum">{receipt.payout !== undefined ? fmtUsdc(receipt.payout) : "Confirmed"}</div>
            </div>
            {receipt.claimId !== undefined && (
              <div className="t-caption t-mono break-all">Claim {receipt.claimId.toString(16).slice(0, 18)}…</div>
            )}
            <div className="flex gap-2">
              <a className="t-body text-accent" href={txUrl(receipt.hash)} target="_blank" rel="noreferrer">
                View transaction
              </a>
              <span className="text-faint">·</span>
              <a className="t-body text-accent" href="/book">
                See it in the book
              </a>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
