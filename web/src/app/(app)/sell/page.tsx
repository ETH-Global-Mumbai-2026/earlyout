"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AmountInput } from "@/components/AmountInput";
import { FundsTable } from "@/components/FundsTable";
import { QuoteCard } from "@/components/QuoteCard";
import { TestTokens } from "@/components/app/TestTokens";
import { WalletWelcome } from "@/components/app/WalletWelcome";
import { GlassBackdrop } from "@/components/art/GlassBackdrop";
import { GLASS_BG } from "@/components/art/glass";
import { Button, Notice, Sheet, Spinner } from "@/components/ui/primitives";
import { TermSheet } from "@/components/ui/TermSheet";
import { AppHeader } from "@/components/AppHeader";
import { marketFrom } from "@/lib/pricing";
import { isScheduled } from "@/lib/glossary";
import { errorMessage, useAccountState, useFunds, useQuote, useSell, useVault, useWallet } from "@/hooks/useEarlyout";
import { useNow } from "@/hooks/useNow";
import { txUrl } from "@/lib/chain";
import { COPY } from "@/lib/copy";
import { fmtUsdc, parseUnitsSafe } from "@/lib/format";
import type { Fund, Receipt } from "@/lib/types";

const C = COPY.app.sell;

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

  const amount = useMemo(() => parseUnitsSafe(amountText, 18), [amountText]);
  const quote = useQuote(fund?.address, amount && amount > 0n ? amount : null);
  const balance = fund && account.data ? account.data.fundBalances[fund.address] : undefined;
  const overBalance = amount !== null && balance !== undefined && amount > balance;
  // An empty amount shows no quote, even if an earlier one is still cached.
  const q = amount && amount > 0n ? quote.data : undefined;
  // While a new amount or fund is being priced, the quote shown is the previous
  // one (kept to avoid flicker). Never sell on it: its payout and minimum belong
  // to a different order.
  const fresh = !!q && !quote.isPlaceholderData;
  const canSell = !!fund && fresh && q.verdict === "BUY" && amount !== null && amount > 0n && wallet.isConnected && !overBalance && !sell.isPending;

  async function onSell() {
    if (!fund || !q || !fresh || amount === null) return;
    try {
      const r = await sell.mutateAsync({ fund: fund.address, amount, minPayout: (q.payout * 995n) / 1000n });
      setReceipt(r);
      setAmountText("");
    } catch {
      // Shown under the ticket through sell.isError.
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <AppHeader title={C.title}>{C.description}</AppHeader>

      {funds.isPending && (
        <div className="flex justify-center py-10 text-muted">
          <Spinner />
        </div>
      )}
      {funds.isError && <Notice tone="error">Could not load funds: {errorMessage(funds.error)}</Notice>}

      {funds.data && fund && (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <div className="t-label mb-3">1. Choose your fund</div>
            <FundsTable show="buyable" funds={funds.data} value={fund.address} onChange={setFund} now={now} market={market} />
          </div>

          <div className="grid gap-4 lg:sticky lg:top-[100px] lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <WalletWelcome screen="sell" />
            <div className="t-label">2. Enter an amount</div>
            <div role="region" aria-label={C.ticket}>
              <TermSheet raised header={`${C.ticket} · ${fund.symbol}`}>
                <AmountInput value={amountText} onChange={setAmountText} unit={fund.symbol} balance={balance} />
                {overBalance && <p className="mt-2 text-[13px] text-refuse">{C.overHolding}</p>}
                <div className="mt-2">
                  <QuoteCard
                    quote={q}
                    pending={quote.isFetching}
                    symbol={fund.symbol}
                    action={
                      <Button size="lg" className="w-full" onClick={onSell} disabled={!canSell} loading={sell.isPending}>
                        {!wallet.isConnected ? "Connect a wallet to sell" : q?.verdict === "BUY" ? `Sell for ${fmtUsdc(q.payout, q.payout < 10_000n)}` : "Sell"}
                      </Button>
                    }
                  />
                </div>
              </TermSheet>
            </div>
            <TestTokens need="sell" />
            {sell.isError && <Notice tone="error">{errorMessage(sell.error)}</Notice>}
            <p className="t-caption">{C.settlementNote} Testnet only.</p>
          </div>

          <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            <FundsTable show="daily" funds={funds.data} value={fund.address} onChange={setFund} now={now} market={market} />
          </div>
        </div>
      )}

      <Sheet open={!!receipt} onClose={() => setReceipt(null)} title="Sold">
        {receipt && (
          <div className="grid gap-3">
            <div className={`relative -mx-1 overflow-hidden rounded-[6px] px-4 py-5 ${GLASS_BG}`}>
              <GlassBackdrop wash="center" />
              <div className="relative">
              <div className="t-label !text-ink-2">{C.receipt.received}</div>
              <div className="t-figure mt-1 text-[2rem] leading-none">{receipt.payout !== undefined ? fmtUsdc(receipt.payout, true) : "Confirmed"}</div>
              </div>
            </div>
            {receipt.claimId !== undefined && <div className="t-caption t-mono break-all">Claim 0x{receipt.claimId.toString(16).slice(0, 16)}…</div>}
            <ol className="grid gap-2.5 border-l border-hairline pl-4 text-[14px]">
              <li><span className="font-medium">Now.</span> <span className="text-muted">USDC is in your wallet. You are done.</span></li>
              <li><span className="font-medium">Until payout day.</span> <span className="text-muted">Earlyout waits for the fund. Your sale is listed in My sales.</span></li>
              <li><span className="font-medium">On payout day.</span> <span className="text-muted">The fund pays Earlyout. Nothing for you to do.</span></li>
            </ol>
            <div className="flex gap-4 text-[13px]">
              <a className="text-ink underline underline-offset-4" href={txUrl(receipt.hash)} target="_blank" rel="noreferrer">
                View transaction
              </a>
              <Link className="text-ink underline underline-offset-4" href="/sales">
                See it in My sales
              </Link>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
