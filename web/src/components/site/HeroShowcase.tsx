"use client";

import { useState } from "react";
import { FundsTable } from "../FundsTable";
import { QuoteCard } from "../QuoteCard";
import { curveMarks } from "@/lib/marks";
import { marketFrom } from "@/lib/pricing";
import { isScheduled } from "@/lib/glossary";
import { SpreadCurve } from "../viz/SpreadCurve";
import { Panel, Spinner } from "../ui/primitives";
import { useFunds, useQuote, useVault } from "@/hooks/useEarlyout";
import { useNow } from "@/hooks/useNow";
import type { Fund } from "@/lib/types";

const AMOUNT = 10n ** 15n; // 0.001 of a unit: what the testnet vault can buy right now

/// The hero's product shot is the product: the live fund list and a live quote,
/// read from the vault on Arc, laid out as the app's own grouped sections on a raised sheet.
export function HeroShowcase() {
  const funds = useFunds();
  const market = marketFrom(useVault().data);
  const now = useNow();
  const [picked, setPicked] = useState<Fund>();
  const fund = picked ?? funds.data?.find((f) => f.settlementDelay < 86400) ?? funds.data?.[0];
  const quote = useQuote(fund?.address, fund ? AMOUNT : null);

  return (
    <div className="glass mx-auto w-full max-w-5xl rounded-[30px] p-3 text-left sm:p-6">
      {!funds.data || !fund ? (
        <div className="flex h-72 items-center justify-center text-muted">
          <Spinner />
        </div>
      ) : (
        <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-6">
            <Panel title="Funds" note="Live from Arc" plain>
              <FundsTable funds={funds.data.filter((f) => isScheduled(f.symbol))} value={fund.address} onChange={setPicked} now={now} market={market} />
            </Panel>
            <Panel title="Spread by time to payout" note={`${fund.symbol} terms`} bodyClassName="flex flex-1 flex-col justify-center p-4" className="hidden flex-1 lg:flex lg:flex-col">
              <SpreadCurve height={240} baseBps={50} utilBps={quote.data?.utilBps ?? 0} creditBps={fund.creditBps} volBps={fund.volBps} maxDays={180} marks={curveMarks(funds.data, fund)} />
            </Panel>
          </div>
          <Panel title="Quote" note={`0.001 ${fund.symbol}`} footer={`The app also prices ${funds.data.filter((f) => !isScheduled(f.symbol)).length} daily-liquidity funds from their Chainlink feeds, for comparison.`}>
            <QuoteCard quote={quote.data} pending={quote.isFetching} symbol={fund.symbol} />
          </Panel>
        </div>
      )}
    </div>
  );
}
