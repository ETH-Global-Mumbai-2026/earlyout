"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AmountInput } from "@/components/AmountInput";
import { FundsTable } from "@/components/FundsTable";
import { QuoteCard } from "@/components/QuoteCard";
import { Button, Notice, Panel, Sheet, Spinner } from "@/components/ui/primitives";
import { AppHeader } from "@/components/AppHeader";
import { curveMarks } from "@/lib/marks";
import { marketFrom } from "@/lib/pricing";
import { isScheduled } from "@/lib/glossary";
import { SpreadCurve } from "@/components/viz/SpreadCurve";
import { errorMessage, useAccountState, useFunds, useQuote, useSell, useTryAsJudge, useVault, useWallet } from "@/hooks/useEarlyout";
import { useNow } from "@/hooks/useNow";
import { MODE } from "@/lib/addresses";
import { txUrl } from "@/lib/chain";
import { fmtUsdc, parseUnitsSafe } from "@/lib/format";
import type { Fund, Receipt } from "@/lib/types";

export default function SellPage() {
  const funds = useFunds();
  const market = marketFrom(useVault().data);
  const wallet = useWallet();
  const account = useAccountState();
  const now = useNow();
  const [selected, setFund] = useState<Fund>();
  const fund = selected ?? funds.data?.find((f) => isScheduled(f.symbol)) ?? funds.data?.[0];
  const [amountText, setAmountText] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const sell = useSell();
  const judge = useTryAsJudge();

  const amount = useMemo(() => parseUnitsSafe(amountText, 18), [amountText]);
  const quote = useQuote(fund?.address, amount && amount > 0n ? amount : null);
  const balance = fund && account.data ? account.data.fundBalances[fund.address] : undefined;
  const overBalance = amount !== null && balance !== undefined && amount > balance;
  const holdsNothing = MODE === "chain" && wallet.isConnected && !!account.data && Object.values(account.data.fundBalances).every((b) => b === 0n);
  const q = quote.data;
  const canSell = !!fund && !!q && q.verdict === "BUY" && amount !== null && amount > 0n && wallet.isConnected && !overBalance && !sell.isPending;

  async function onSell() {
    if (!fund || !q || amount === null) return;
    try {
      const r = await sell.mutateAsync({ fund: fund.address, amount, minPayout: (q.payout * 995n) / 1000n });
      setReceipt(r);
      setAmountText("");
    } catch {
      // Shown under the quote through sell.isError.
    }
  }

  return (
    <div className="grid gap-8">
      <AppHeader title="Sell your pending redemption">
        Pick a fund and an amount. The vault shows its verdict and the exact price before anything moves, and USDC reaches your wallet in the same transaction.
      </AppHeader>

      {funds.isPending && (
        <div className="flex justify-center py-10 text-muted">
          <Spinner />
        </div>
      )}
      {funds.isError && <Notice tone="error">Could not load funds: {errorMessage(funds.error)}</Notice>}

      {funds.data && fund && (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <Panel title="Funds" note="Live from Arc" plain>
              <FundsTable show="buyable" funds={funds.data} value={fund.address} onChange={setFund} now={now} market={market} />
            </Panel>
          </div>

          <div className="grid gap-6 lg:sticky lg:top-[112px] lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <Panel title="Your sale">
              <div className="ios-row">
                <span className="flex-1 text-[17px]">Fund</span>
                <span className="text-[17px] text-muted">{fund.symbol}</span>
              </div>
              <AmountInput value={amountText} onChange={setAmountText} unit={fund.symbol} balance={balance} />
            </Panel>
            {holdsNothing && (
              <Notice tone="info">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>This wallet holds no fund tokens.</span>
                  <Button size="sm" variant="secondary" onClick={() => wallet.address && judge.mutate(wallet.address)} loading={judge.isPending}>
                    Try as judge
                  </Button>
                </div>
                {judge.isError && <div className="mt-1.5 text-halt">{errorMessage(judge.error)}</div>}
              </Notice>
            )}
            {overBalance && <Notice tone="warn">That is more than you hold.</Notice>}
            <Panel title="Quote" footer="Paid in USDC on Arc in the same transaction. Your fund tokens join the issuer redemption queue and the claim goes to the vault. Testnet only.">
              <QuoteCard quote={q} pending={quote.isFetching} symbol={fund.symbol} />
            </Panel>
            {sell.isError && <Notice tone="error">{errorMessage(sell.error)}</Notice>}
            <Button size="lg" className="w-full" onClick={onSell} disabled={!canSell} loading={sell.isPending}>
              {!wallet.isConnected ? "Connect a wallet to sell" : q?.verdict === "BUY" ? `Sell for ${fmtUsdc(q.payout)}` : "Sell"}
            </Button>
          </div>

          {/* On phones this follows the sale form; on desktop it sits under the funds. */}
          <div className="grid min-w-0 gap-8 lg:col-start-1 lg:row-start-2">
            <FundsTable show="daily" funds={funds.data} value={fund.address} onChange={setFund} now={now} market={market} />
            <Panel title="Spread by time to payout" note={`${fund.symbol} terms`} bodyClassName="p-4" footer="Waiting is the main cost, and it is priced, not hidden.">
              <SpreadCurve
                height={190}
                baseBps={50}
                utilBps={q?.utilBps ?? 0}
                creditBps={fund.creditBps}
                volBps={fund.volBps}
                maxDays={180}
                marks={curveMarks(funds.data, fund)}
              />
            </Panel>
          </div>
        </div>
      )}

      <Sheet open={!!receipt} onClose={() => setReceipt(null)} title="Sold">
        {receipt && (
          <div className="grid gap-3">
            <div>
              <div className="t-eyebrow">USDC received</div>
              <div className="num mt-1 text-2xl font-semibold">{receipt.payout !== undefined ? fmtUsdc(receipt.payout, true) : "Confirmed"}</div>
            </div>
            {receipt.claimId !== undefined && <div className="t-caption t-mono break-all">Claim 0x{receipt.claimId.toString(16).slice(0, 16)}…</div>}
            <ol className="grid gap-2.5 border-l border-hairline pl-4 text-[14px]">
              <li><span className="font-medium">Now.</span> <span className="text-muted">USDC is in your wallet. You are done.</span></li>
              <li><span className="font-medium">Until the payout date.</span> <span className="text-muted">The claim is listed in the public book on Arkiv.</span></li>
              <li><span className="font-medium">On the payout date.</span> <span className="text-muted">The issuer pays the vault, and the claim leaves the book on its own.</span></li>
            </ol>
            <div className="flex gap-4 text-[13px]">
              <a className="text-accent hover:underline" href={txUrl(receipt.hash)} target="_blank" rel="noreferrer">
                View transaction
              </a>
              <Link className="text-accent hover:underline" href="/book">
                See it in the book
              </Link>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
