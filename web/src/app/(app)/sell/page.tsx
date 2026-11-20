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
import { Button, Notice, Segmented, Sheet, Spinner } from "@/components/ui/primitives";
import { TermSheet } from "@/components/ui/TermSheet";
import { AppHeader } from "@/components/AppHeader";
import { marketFrom } from "@/lib/pricing";
import { isScheduled } from "@/lib/glossary";
import { errorMessage, useAccountState, useCircle, useFunds, useQuote, useSell, useVault, useWallet } from "@/hooks/useEarlyout";
import { useNow } from "@/hooks/useNow";
import { bridgeAvailable, useBridgeFee, useBridgeStatus, useSellAndBridge } from "@/hooks/useBridge";
import { CCTP_CHAINS, receivedAfterFee, type CctpChainKey } from "@/lib/cctp";
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
  const bridge = useSellAndBridge();
  const [payTo, setPayTo] = useState<CctpChainKey>("arc");

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
  const fee = useBridgeFee("arc", payTo, q?.verdict === "BUY" ? q.payout : undefined);
  const circle = useCircle();
  // A Circle wallet lives on Arc only, so it is paid on Arc.
  const canBridge = bridgeAvailable && circle.status !== "ready";
  const crossChain = canBridge && payTo !== "arc";
  const feeReady = !crossChain || (!!fee.data && !fee.isPlaceholderData && !!q && q.payout > fee.data.maxFee);
  const busy = sell.isPending || bridge.isPending;
  const canSell = !!fund && fresh && q.verdict === "BUY" && amount !== null && amount > 0n && wallet.isConnected && !overBalance && !busy && feeReady;

  async function onSell() {
    if (!fund || !q || !fresh || amount === null) return;
    try {
      const minPayout = (q.payout * 995n) / 1000n;
      let r;
      if (crossChain) {
        // Quote Circle's fee again right before sending: a fee that rose since
        // the last quote would leave the USDC unforwarded on the other chain.
        const latest = (await fee.refetch()).data;
        if (!latest || q.payout <= latest.maxFee) return;
        r = await bridge.mutateAsync({ fund: fund.address, amount, minPayout, to: payTo, maxFee: latest.maxFee });
      } else {
        r = await sell.mutateAsync({ fund: fund.address, amount, minPayout });
      }
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
                {canBridge && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="t-label">{C.payTo.label}</span>
                    <Segmented
                      label={C.payTo.label}
                      value={payTo}
                      onChange={setPayTo}
                      options={(Object.keys(CCTP_CHAINS) as CctpChainKey[]).map((k) => ({ value: k, label: CCTP_CHAINS[k].name }))}
                    />
                  </div>
                )}
                {crossChain && q?.verdict === "BUY" && (
                  <p className="mt-2 text-[13px] text-ink-2" aria-live="polite">
                    {fee.isError
                      ? C.payTo.feeError
                      : fee.data
                        ? C.payTo.arrives(CCTP_CHAINS[payTo].name, fmtUsdc(fee.data.received, true), fmtUsdc(fee.data.maxFee, true))
                        : C.payTo.quoting}
                  </p>
                )}
                <div className="mt-2">
                  <QuoteCard
                    quote={q}
                    pending={quote.isFetching}
                    symbol={fund.symbol}
                    action={
                      <Button size="lg" className="w-full" onClick={onSell} disabled={!canSell} loading={busy}>
                        {!wallet.isConnected
                          ? "Connect a wallet to sell"
                          : q?.verdict !== "BUY"
                            ? "Sell"
                            : crossChain
                              ? C.payTo.button(CCTP_CHAINS[payTo].name)
                              : `Sell for ${fmtUsdc(q.payout, q.payout < 10_000n)}`}
                      </Button>
                    }
                  />
                </div>
              </TermSheet>
            </div>
            <TestTokens need="sell" />
            {sell.isError && <Notice tone="error">{errorMessage(sell.error)}</Notice>}
            {bridge.isError && <Notice tone="error">{errorMessage(bridge.error)}</Notice>}
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
              <div className="t-label !text-ink-2">{receipt.bridge ? C.payTo.sending(CCTP_CHAINS[receipt.bridge.to].name) : C.receipt.received}</div>
              <div className="t-figure mt-1 text-[2rem] leading-none">
                {receipt.payout === undefined
                  ? "Confirmed"
                  : fmtUsdc(receipt.bridge ? receivedAfterFee(receipt.payout, receipt.bridge.maxFee) : receipt.payout, true)}
              </div>
              </div>
            </div>
            {receipt.claimId !== undefined && <div className="t-caption t-mono break-all">Claim 0x{receipt.claimId.toString(16).slice(0, 16)}…</div>}
            {receipt.bridge && <BridgeProgress hash={receipt.hash} to={receipt.bridge.to} />}
            <ol className="grid gap-2.5 border-l border-hairline pl-4 text-[14px]">
              <li>
                <span className="font-medium">Now.</span>{" "}
                <span className="text-muted">{receipt.bridge ? C.payTo.now(CCTP_CHAINS[receipt.bridge.to].name) : "USDC is in your wallet. You are done."}</span>
              </li>
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

/// Circle CCTP status for a payout on its way to another chain.
function BridgeProgress({ hash, to }: { hash: string; to: CctpChainKey }) {
  const status = useBridgeStatus(hash);
  const chain = CCTP_CHAINS[to];
  const s = status.data;
  return (
    <div role="status" className="flex items-center gap-2 text-[14px]">
      {(!s || s.state === "pending") && (
        <>
          <Spinner /> <span className="text-muted">{C.payTo.pending(chain.name)}</span>
        </>
      )}
      {s?.state === "complete" && (
        <span>
          {C.payTo.arrived(chain.name)}{" "}
          <a className="text-ink underline underline-offset-4" href={`${chain.explorer}/tx/${s.destinationTx}`} target="_blank" rel="noreferrer">
            {C.payTo.viewThere(chain.name)}
          </a>
        </span>
      )}
      {s?.state === "failed" && <span className="text-halt">{C.payTo.failed}</span>}
      {status.isError && <span className="text-muted">{C.payTo.statusError}</span>}
    </div>
  );
}
