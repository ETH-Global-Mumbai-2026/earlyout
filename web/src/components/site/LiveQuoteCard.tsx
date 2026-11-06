"use client";

import { useFunds, useQuote } from "@/hooks/useEarlyout";
import { useNow } from "@/hooks/useNow";
import { fmtBps, fmtDate, fmtNav, fmtUsdc } from "@/lib/format";
import { Badge } from "../ui/primitives";
import { SpreadCurve } from "../viz/SpreadCurve";
import { TermKey } from "../viz/SpreadBar";

const PROBE = 10n ** 15n; // 0.001 of a unit, scaled to a per-unit price

/// A real quote for the 90-day ACRED claim, read from the Vault contract on Arc.
export function LiveQuoteCard() {
  const funds = useFunds();
  const fund = funds.data?.[0];
  const quote = useQuote(fund?.address, fund ? PROBE : null);
  const now = useNow();
  const q = quote.data;
  const days = q ? Math.max(0, Math.round((q.settleAt - now) / 86400)) : 90;
  const verdict = q?.verdict;

  return (
    <div className="card p-5 shadow-[0_24px_48px_-16px_rgba(16,24,40,0.16)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold">Quote · {fund?.symbol ?? "ACRED"}</div>
          <div className="t-caption">{q ? `1 unit · pays ${fmtDate(q.settleAt).split(",")[0]} · read from the vault on Arc` : "Reading the vault on Arc"}</div>
        </div>
        {verdict && (
          <Badge tone={verdict === "BUY" ? "good" : verdict === "REFUSE" ? "warn" : "bad"}>
            <span className="badge-dot" />
            {verdict === "BUY" ? "Approved" : verdict === "REFUSE" ? "Refused" : "Halted"}
          </Badge>
        )}
      </div>
      <div className="mt-4 overflow-hidden rounded-md border border-hairline text-[13px]">
        <div className="flex justify-between border-b border-hairline px-3.5 py-2.5">
          <span className="text-muted">NAV per unit</span>
          <span className="tnum">{q ? fmtNav(q.nav) : "…"}</span>
        </div>
        {(
          [
            ["Base", q?.baseBps],
            ["Vault usage", q?.utilBps],
            [`Time to payout, ${days} days`, q?.timeBps],
            ["Issuer credit", q?.creditBps],
          ] as const
        ).map(([name, bps], i) => (
          <div key={i} className="flex justify-between border-b border-hairline px-3.5 py-2.5">
            <span className="text-muted">
              <TermKey i={i} />
              {name}
            </span>
            <span className="tnum">{bps === undefined ? "…" : fmtBps(bps)}</span>
          </div>
        ))}
        <div className="flex items-baseline justify-between bg-surface-2 px-3.5 py-3">
          <span className="font-medium">Proceeds per unit</span>
          <span className="text-xl font-semibold">{q ? fmtUsdc(q.payout * 1000n) : "…"}</span>
        </div>
      </div>
      {fund && q && (
        <SpreadCurve className="mt-4" height={140} baseBps={q.baseBps} utilBps={q.utilBps} creditBps={fund.creditBps} volBps={fund.volBps} maxDays={180} marks={[{ days, label: `${days} days` }]} />
      )}
    </div>
  );
}
