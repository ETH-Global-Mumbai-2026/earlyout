"use client";

import { useMemo, useState } from "react";
import { AmountInput } from "@/components/AmountInput";
import { Button, Segmented, Spinner } from "@/components/ui/primitives";
import { TermSheet } from "@/components/ui/TermSheet";
import { errorMessage, useWallet } from "@/hooks/useEarlyout";
import { useBridgeFee, useBridgeIn, useBridgeStatus } from "@/hooks/useBridge";
import { CCTP_CHAINS, type CctpChainKey } from "@/lib/cctp";
import { COPY } from "@/lib/copy";
import { fmtUsdc, parseUnitsSafe } from "@/lib/format";

const C = COPY.app.vault.bridgeIn;
type From = Exclude<CctpChainKey, "arc">;

/// Bring USDC to Arc from another chain with Circle CCTP, then deposit it.
export function BridgeIn({ onArrived }: { onArrived: (amount: bigint) => void }) {
  const wallet = useWallet();
  const [from, setFrom] = useState<From>("base");
  const [text, setText] = useState("");
  const amount = useMemo(() => parseUnitsSafe(text, 6), [text]);
  const fee = useBridgeFee(from, "arc", amount ?? undefined);
  const send = useBridgeIn();
  const [sent, setSent] = useState<{ hash: string; from: From; received: bigint }>();
  const status = useBridgeStatus(sent?.hash, sent?.from);
  const src = CCTP_CHAINS[from];
  const ready = !!amount && amount > 0n && !!fee.data && !fee.isPlaceholderData && amount > fee.data.maxFee && wallet.isConnected && !send.isPending;

  async function go() {
    if (!amount || !fee.data) return;
    try {
      const hash = await send.mutateAsync({ from, amount, maxFee: fee.data.maxFee });
      setSent({ hash, from, received: fee.data.received });
      setText("");
    } catch {
      // Shown below through send.error.
    }
  }

  const arrived = status.data?.state === "complete";

  return (
    <TermSheet header={C.title}>
      <p className="mt-1 text-[14px] text-ink-2">{C.lede}</p>
      {!sent && (
        <>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="t-label">{C.from}</span>
            <Segmented
              label={C.from}
              value={from}
              onChange={setFrom}
              options={(["base", "ethereum"] as From[]).map((k) => ({ value: k, label: CCTP_CHAINS[k].name }))}
            />
          </div>
          <div className="mt-3">
            <AmountInput value={text} onChange={setText} unit="USDC" decimals={6} label={C.amount(src.name)} />
          </div>
          {fee.data && amount && amount > 0n && (
            <p className="mt-2 text-[13px] text-ink-2" aria-live="polite">
              {amount > fee.data.maxFee ? C.arrives(fmtUsdc(fee.data.received, true), fmtUsdc(fee.data.maxFee, true)) : C.tooSmall(fmtUsdc(fee.data.maxFee, true))}
            </p>
          )}
          {fee.isError && <p className="mt-2 text-[13px] text-halt">{C.feeError}</p>}
          {send.isError && <p className="mt-2 text-[13px] text-halt">{errorMessage(send.error)}</p>}
          <Button variant="secondary" size="lg" className="mt-3 w-full" onClick={go} disabled={!ready} loading={send.isPending}>
            {wallet.isConnected ? C.button(src.name) : "Connect a wallet"}
          </Button>
          <p className="t-caption mt-2">{C.note(src.name)}</p>
        </>
      )}
      {sent && (
        <div className="mt-3 grid gap-3" role="status">
          {!arrived && status.data?.state !== "failed" && (
            <div className="flex items-center gap-2 text-[14px]">
              <Spinner /> <span className="text-muted">{C.pending}</span>
            </div>
          )}
          {status.data?.state === "failed" && <p className="text-[14px] text-halt">{C.failed}</p>}
          {arrived && (
            <>
              <p className="text-[14px]">{C.arrived(fmtUsdc(sent.received, true))}</p>
              <Button size="lg" className="w-full" onClick={() => { onArrived(sent.received); setSent(undefined); }}>
                {C.depositIt}
              </Button>
            </>
          )}
          <a className="text-[13px] text-ink underline underline-offset-4" href={`${CCTP_CHAINS[sent.from].explorer}/tx/${sent.hash}`} target="_blank" rel="noreferrer">
            {C.viewBurn(CCTP_CHAINS[sent.from].name)}
          </a>
        </div>
      )}
    </TermSheet>
  );
}
