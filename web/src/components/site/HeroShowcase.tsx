"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { FundsTable } from "../FundsTable";
import { QuoteCard } from "../QuoteCard";
import { curveMarks } from "@/lib/marks";
import { marketFrom } from "@/lib/pricing";
import { isScheduled } from "@/lib/glossary";
import { SpreadCurve } from "../viz/SpreadCurve";
import { Spinner } from "../ui/primitives";
import { useFunds, useQuote, useVault } from "@/hooks/useEarlyout";
import { useNow } from "@/hooks/useNow";
import type { Fund } from "@/lib/types";

const AMOUNT = 10n ** 15n; // 0.001 of a unit: what the testnet vault can buy right now

/// The hero's product shot is the product: the live fund list and a live quote,
/// read from the vault on Arc, in a window that settles from a slight tilt onto a
/// dotted stage.
export function HeroShowcase() {
  const funds = useFunds();
  const market = marketFrom(useVault().data);
  const reduce = useReducedMotion();
  const now = useNow();
  const [picked, setPicked] = useState<Fund>();
  const fund = picked ?? funds.data?.find((f) => f.settlementDelay < 86400) ?? funds.data?.[0];
  const quote = useQuote(fund?.address, fund ? AMOUNT : null);

  return (
    <div className="relative rounded-[28px] bg-canvas bg-[radial-gradient(circle,rgba(0,0,0,0.09)_1px,transparent_1.2px)] bg-[length:18px_18px] px-3 pb-10 pt-10 [perspective:1600px] sm:px-10 sm:pt-14">
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(48px) rotateX(14deg) scale(0.96)" }}
      animate={{ opacity: 1, transform: "translateY(0px) rotateX(0deg) scale(1)" }}
      transition={reduce ? { duration: 0.3 } : { type: "spring", bounce: 0, duration: 1.2, delay: 0.3 }}
      style={{ transformOrigin: "50% 100%" }}
      className="relative mx-auto w-full max-w-5xl"
    >
      <div className="overflow-hidden rounded-[22px] border border-black/[0.06] bg-surface shadow-[var(--shadow-float)]">
        <div className="flex items-center gap-2 border-b border-hairline bg-surface-2 px-4 py-3">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
          <span className="mx-auto rounded-md bg-sunk px-3 py-1 text-[11px] text-muted">earlyout.vercel.app/sell</span>
          <span className="w-12" />
        </div>
        {!funds.data || !fund ? (
          <div className="flex h-72 items-center justify-center text-muted">
            <Spinner />
          </div>
        ) : (
          <div className="grid text-left lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 border-b border-hairline lg:border-b-0 lg:border-r">
              <div className="px-5 pb-2 pt-4 text-[13px] font-semibold">Eligible funds</div>
              <FundsTable funds={funds.data.filter((f) => isScheduled(f.symbol))} value={fund.address} onChange={setPicked} now={now} market={market} />
              <p className="px-5 py-3 text-[12px] text-muted">Live from the Vault and NavOracle contracts on Arc testnet. Pick a fund to re-quote. The app also prices {funds.data.filter((f) => !isScheduled(f.symbol)).length} daily-liquidity funds from their Chainlink feeds, for comparison.</p>
              <div className="hidden border-t border-hairline px-5 pb-4 pt-3 lg:block">
                <div className="text-[13px] font-semibold">Spread by time to payout</div>
                <SpreadCurve
                  className="mt-2"
                  height={170}
                  baseBps={50}
                  utilBps={quote.data?.utilBps ?? 0}
                  creditBps={fund.creditBps}
                  volBps={fund.volBps}
                  maxDays={180}
                  marks={curveMarks(funds.data, fund)}
                />
              </div>
            </div>
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateX(24px)" }}
              animate={{ opacity: 1, transform: "translateX(0px)" }}
              transition={reduce ? { duration: 0.3 } : { type: "spring", bounce: 0, duration: 0.8, delay: 0.6 }}
              className="grid content-start gap-3 bg-surface-2 p-5"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-semibold">Quote for 0.001 {fund.symbol}</span>
              </div>
              <QuoteCard quote={quote.data} pending={quote.isFetching} symbol={fund.symbol} />
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
    </div>
  );
}
