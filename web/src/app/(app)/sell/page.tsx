"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AmountInput } from "@/components/AmountInput";
import { FundsTable } from "@/components/FundsTable";
import { QuoteCard } from "@/components/QuoteCard";
import { Button, Notice, Panel, Sheet, Spinner } from "@/components/ui/primitives";
import { AppHeader } from "@/components/AppHeader";
import { Steps } from "@/components/Steps";
import { Abbr } from "@/components/ui/Abbr";
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
    const r = await sell.mutateAsync({ fund: fund.address, amount, minPayout: (q.payout * 995n) / 1000n });
    setReceipt(r);
    setAmountText("");
  }

  return (
    <div className="grid gap-4">
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
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid min-w-0 gap-4">
            <Panel title="Eligible funds" note={<>Net asset value (<Abbr k="NAV" />) from Chainlink · bid per unit from the vault</>}>
              <FundsTable funds={funds.data} value={fund.address} onChange={setFund} now={now} market={market} />
            </Panel>
            <Panel title={`Spread by time to payout · ${fund.symbol} terms`} note="Waiting is priced, not hidden" bodyClassName="p-4">
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

          <Panel title="Sell ticket" bodyClassName="grid gap-4 p-5" className="lg:sticky lg:top-[104px]">
            <Steps steps={["Fund", "Amount", "Verdict", "Sell"]} done={!amount || amount === 0n ? 1 : !q ? 2 : q.verdict === "BUY" ? 3 : 2} />
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
            <div>
              <div className="t-eyebrow mb-1.5">Fund</div>
              <div className="control flex items-center justify-between px-3 py-2.5">
                <span className="font-medium">{fund.symbol}</span>
                <span className="t-caption">pays after {fund.settlementDelay < 86400 ? `${Math.round(fund.settlementDelay / 60)} min` : `${Math.round(fund.settlementDelay / 86400)} days`}</span>
              </div>
            </div>
            <AmountInput value={amountText} onChange={setAmountText} unit={fund.symbol} balance={balance} />
            {overBalance && <Notice tone="warn">That is more than you hold.</Notice>}
            <QuoteCard quote={q} pending={quote.isFetching} symbol={fund.symbol} />
            {sell.isError && <Notice tone="error">{errorMessage(sell.error)}</Notice>}
            <Button size="lg" className="w-full" onClick={onSell} disabled={!canSell} loading={sell.isPending}>
              {!wallet.isConnected ? "Connect a wallet to sell" : q?.verdict === "BUY" ? `Sell for ${fmtUsdc(q.payout)}` : "Sell"}
            </Button>
            <p className="t-caption">Your fund tokens join the issuer redemption queue. The claim goes to the vault. Testnet only.</p>
          </Panel>
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
            <ol className="grid gap-2.5 border-l border-hairline pl-4 text-[13px]">
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
