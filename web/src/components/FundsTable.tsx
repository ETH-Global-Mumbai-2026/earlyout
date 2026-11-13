"use client";

import { FundMark } from "./brand/FundMark";
import { fmtBps, fmtDuration, fmtNav, fmtUsdc } from "@/lib/format";
import { displayName, isScheduled } from "@/lib/glossary";
import { indicativeBid } from "@/lib/pricing";
import type { Fund } from "@/lib/types";
import { cn } from "@/lib/utils";

type Market = { baseBps: number; utilBps: number } | undefined;

function statusOf(f: Fund, now: number): { cls: string; label: string } {
  if (f.impaired) return { cls: "text-halt", label: "Impaired" };
  if (f.status === 1) return { cls: "text-halt", label: "Halted" };
  if (now - f.navUpdatedAt > f.maxAge) return { cls: "text-refuse", label: "Stale NAV" };
  return { cls: "text-buy", label: "Open" };
}

const COLS = "grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)] sm:grid-cols-[minmax(0,1.8fr)_repeat(3,minmax(0,0.8fr))_minmax(0,0.7fr)] items-center gap-3";

/// Funds as a flat table. Funds that redeem on a schedule are choices (radio
/// rows, the selected one marked with an ink bar); daily-liquidity funds are a
/// dimmed comparison table that cannot be picked.
export function FundsTable({
  funds,
  value,
  onChange,
  now,
  market,
  show = "all",
}: {
  funds: Fund[];
  value?: string;
  onChange: (f: Fund) => void;
  now: number;
  market: Market;
  show?: "all" | "buyable" | "daily";
}) {
  const buyable = show === "daily" ? [] : funds.filter((f) => isScheduled(f.symbol));
  const daily = show === "buyable" ? [] : funds.filter((f) => !isScheduled(f.symbol));
  const head = "t-label border-b border-ink pb-2";
  return (
    <div className="grid gap-8">
      {buyable.length > 0 && (
        <div>
          <div className={cn(COLS, head)}>
            <span>Fund</span>
            <span className="hidden text-right sm:block">Fund price</span>
            <span className="text-right">You get</span>
            <span className="text-right">Pays in</span>
            <span className="hidden text-right sm:block">Status</span>
          </div>
          <div role="radiogroup" aria-label="Fund">
            {buyable.map((f) => {
              const active = f.address === value;
              const st = statusOf(f, now);
              const bid = market ? indicativeBid(f, now, market) : null;
              return (
                <button
                  key={f.address}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`${f.symbol}, ${f.name}`}
                  onClick={() => onChange(f)}
                  className={cn(
                    COLS,
                    "relative w-full border-b border-hairline py-3 text-left transition-colors hover:bg-surface-2",
                    active && "bg-surface",
                  )}
                >
                  {active && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-ink" />}
                  <span className="flex min-w-0 items-center gap-3 pl-3">
                    <FundMark symbol={f.symbol} size={28} />
                    <span className="min-w-0">
                      <span className="block text-[15px] font-medium text-ink">{f.symbol}</span>
                      <span className="block truncate text-[13px] text-muted">{displayName(f.name)}</span>
                    </span>
                  </span>
                  <span className="num hidden text-right text-[14px] text-ink-2 sm:block">{fmtNav(f.nav)}</span>
                  <span className="text-right">
                    <span className="num block text-[14px] text-ink">{bid ? fmtUsdc(bid.perUnit) : "…"}</span>
                    <span className="block text-[12px] text-muted">{bid ? `${fmtBps(bid.spreadBps)} discount` : ""}</span>
                  </span>
                  <span className="num text-right text-[14px] text-ink-2">{fmtDuration(f.settlementDelay)}</span>
                  <span className={cn("hidden text-right font-mono text-[11px] uppercase tracking-[0.06em] sm:block", st.cls)}>{st.label}</span>
                </button>
              );
            })}
          </div>
          <p className="t-caption mt-2">Prices are per unit, from each fund&apos;s official price, updated live.</p>
        </div>
      )}

      {daily.length > 0 && (
        <div className="opacity-80">
          <div className="t-label mb-2">Daily-liquidity funds, for comparison</div>
          <div className={cn(COLS, head)}>
            <span>Fund</span>
            <span className="hidden text-right sm:block">Fund price</span>
            <span className="text-right">You get</span>
            <span className="text-right">Pays in</span>
            <span className="hidden sm:block" />
          </div>
          <ul>
            {daily.map((f) => (
              <li key={f.address} className={cn(COLS, "border-b border-hairline py-3")}>
                <span className="flex min-w-0 items-center gap-3 pl-3">
                  <FundMark symbol={f.symbol} size={24} className="opacity-70" />
                  <span className="min-w-0">
                    <span className="block text-[14px] text-ink-2">{f.symbol}</span>
                    <span className="block truncate text-[12px] text-muted">{displayName(f.name)}</span>
                  </span>
                </span>
                <span className="num hidden text-right text-[14px] text-ink-2 sm:block">{fmtNav(f.nav)}</span>
                <span className="text-right text-[12px] text-muted">Redeem directly</span>
                <span className="num text-right text-[14px] text-muted">{fmtDuration(f.settlementDelay)}</span>
                <span className="hidden sm:block" />
              </li>
            ))}
          </ul>
          <p className="t-caption mt-2">{`These already pay within a day, so there is nothing to sell early. Shown with their live Chainlink prices.`}</p>
        </div>
      )}
    </div>
  );
}
