"use client";

import { useFunds, useQuote } from "@/hooks/useEarlyout";
import { fmtBps, fmtNav, fmtUsdc } from "@/lib/format";
import { bpsSum } from "@/lib/types";
import { useNow } from "@/hooks/useNow";
import { SpreadBar } from "../viz/SpreadBar";
import { SpreadCurve } from "../viz/SpreadCurve";
import { VerdictPill } from "../ui/primitives";

const PROBE = 10n ** 15n; // 0.001 of a unit: small enough to fit the testnet vault

/// The hero's right side: a real quote for the 90-day ACRED claim, read from the
/// Vault contract on Arc, with the spread broken down and plotted against time.
export function LiveQuoteCard() {
  const funds = useFunds();
  const fund = funds.data?.[0];
  const quote = useQuote(fund?.address, fund ? PROBE : null);
  const now = useNow();
  const q = quote.data;
  const days = q ? Math.max(0, Math.round((q.settleAt - now) / 86400)) : 90;
  const perUnit = q ? q.payout * 1000n : 0n;

  return (
    <div className="card material w-full max-w-md p-5 shadow-2xl sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="t-eyebrow">Live quote · Arc testnet</div>
          <div className="t-headline mt-1">{fund ? `${fund.symbol}, pays in ${days} days` : "Reading the vault"}</div>
        </div>
        {q && <VerdictPill verdict={q.verdict} reason={q.verdict === "BUY" ? "" : q.reason} />}
      </div>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <div className="t-caption">You receive per unit</div>
          <div className="text-[34px] font-semibold leading-none tracking-[-0.02em]">{q ? fmtUsdc(perUnit) : "…"}</div>
        </div>
        {q && (
          <div className="text-right">
            <div className="t-caption">NAV {fmtNav(q.nav)}</div>
            <div className="text-[15px] font-medium tnum">−{fmtBps(bpsSum(q))} spread</div>
          </div>
        )}
      </div>
      {q && <SpreadBar className="mt-5" bps={[q.baseBps, q.utilBps, q.timeBps, q.creditBps]} />}
      {fund && q && (
        <SpreadCurve
          className="mt-4"
          height={150}
          baseBps={q.baseBps}
          utilBps={q.utilBps}
          creditBps={fund.creditBps}
          volBps={fund.volBps}
          maxDays={180}
          marks={[{ days, label: `${days} days` }]}
        />
      )}
    </div>
  );
}
