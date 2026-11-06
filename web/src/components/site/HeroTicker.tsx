"use client";

import { useFunds, useQuote } from "@/hooks/useEarlyout";
import { fmtDate } from "@/lib/format";
import { Money } from "./Money";

const PROBE = 10n ** 15n;

/// The number is the hero: what one ACRED unit fetches today, live from the vault.
export function HeroTicker() {
  const funds = useFunds();
  const fund = funds.data?.[0];
  const q = useQuote(fund?.address, fund ? PROBE : null).data;
  return (
    <div className="flex flex-col items-center">
      <div className="inline-flex items-center gap-2 text-[13px] font-medium text-muted">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-buy opacity-50 motion-reduce:hidden" />
          <span className="relative inline-flex size-2 rounded-full bg-buy" />
        </span>
        Live quote from the vault on Arc
      </div>
      <div className="mt-3 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
        {q ? <Money cents6={q.payout * 1000n} className="text-[44px] font-bold leading-none tracking-[-0.03em] text-ink sm:text-[56px]" /> : <span className="text-[44px] font-bold leading-none text-faint sm:text-[56px]">…</span>}
        <span className="text-[17px] text-muted">
          per ACRED unit today{q ? <>, against a NAV of ${(Number(q.nav / 10n ** 14n) / 10_000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} that pays on {fmtDate(q.settleAt).split(",")[0]}</> : null}
        </span>
      </div>
    </div>
  );
}
