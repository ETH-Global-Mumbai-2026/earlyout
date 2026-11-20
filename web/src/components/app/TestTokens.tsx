"use client";

import { ArrowUpRight } from "lucide-react";
import { Button } from "../ui/primitives";
import { errorMessage, useAccountState, useGetTestTokens, useWallet } from "@/hooks/useEarlyout";
import { MODE } from "@/lib/addresses";
import { COPY } from "@/lib/copy";
import { ARC_USDC_FAUCET_URL, TESTNET } from "@/lib/site";

const C = COPY.app.testTokens;
const ONE_USDC = 1_000_000n;

/// Testnet only: offers stand-in fund tokens (and the allowlist and gas) when
/// the connected wallet is not set up for what this screen needs.
export function TestTokens({ need, allowlisted }: { need: "sell" | "buy" | "deposit"; allowlisted?: boolean }) {
  const wallet = useWallet();
  const account = useAccountState().data;
  const get = useGetTestTokens();
  if (!TESTNET || MODE === "mock" || !wallet.isConnected || !account) return null;
  const noFunds = Object.values(account.fundBalances).every((b) => b === 0n);
  const show = (need === "sell" && noFunds) || (need === "buy" && allowlisted === false) || (need === "deposit" && account.usdc < ONE_USDC);
  if (!show) return null;
  return (
    <aside aria-label={C.title} className="border-y border-hairline bg-surface-2 px-4 py-4">
      <div className="text-[14px] font-medium text-ink">{C.title}</div>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{C.body}</p>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        {need !== "deposit" && (
          <Button size="sm" variant="secondary" onClick={() => wallet.address && get.mutate(wallet.address)} loading={get.isPending}>
            {C.cta}
          </Button>
        )}
        <a href={ARC_USDC_FAUCET_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] text-ink underline underline-offset-4">
          Get test USDC <ArrowUpRight size={12} aria-hidden />
        </a>
      </div>
      {need !== "deposit" && <p className="t-caption mt-2">{C.faucet}</p>}
      {get.isError && <p className="mt-2 text-[13px] text-halt">{errorMessage(get.error)}</p>}
    </aside>
  );
}
