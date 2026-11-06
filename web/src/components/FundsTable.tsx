"use client";

import { fmtBps, fmtDuration, fmtNav, fmtUsdc } from "@/lib/format";
import type { Fund } from "@/lib/types";
import { indicativeBid } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { Abbr } from "./ui/Abbr";
import { Badge } from "./ui/primitives";
import { displayName, isScheduled } from "@/lib/glossary";

function statusOf(f: Fund, now: number): { tone: "good" | "warn" | "bad"; label: string } {
  if (f.impaired) return { tone: "bad", label: "Impaired" };
  if (f.status === 1) return { tone: "bad", label: "Halted" };
  if (now - f.navUpdatedAt > f.maxAge) return { tone: "warn", label: "Stale NAV" };
  return { tone: "good", label: "Open" };
}

type Market = { baseBps: number; utilBps: number } | undefined;

function Bid({ f, now, market }: { f: Fund; now: number; market: Market }) {
  if (!market) return <span className="text-faint">…</span>;
  return <span className="num text-ink">{fmtUsdc(indicativeBid(f, now, market).perUnit).replace("$", "")}</span>;
}

function Spread({ f, now, market }: { f: Fund; now: number; market: Market }) {
  return <span className="num">{market ? fmtBps(indicativeBid(f, now, market).spreadBps) : "…"}</span>;
}

function GroupHead({ daily }: { daily?: boolean }) {
  return (
    <div className="border-b border-hairline bg-surface-2 px-5 py-2 text-[12px]">
      {daily ? (
        <>
          <span className="font-semibold text-ink-2">Daily-liquidity funds</span>
          <span className="text-muted"> · they already pay within days, so there is nothing to sell early. Priced by the same Chainlink feeds, for comparison.</span>
        </>
      ) : (
        <>
          <span className="font-semibold text-ink-2">Scheduled redemptions</span>
          <span className="text-muted"> · what Earlyout buys</span>
        </>
      )}
    </div>
  );
}

/// Eligible funds as a selectable table. Each row is a radio, so keyboard and
/// screen readers treat it as one choice among the funds.
export function FundsTable({ funds, value, onChange, now, market }: { funds: Fund[]; value?: string; onChange: (f: Fund) => void; now: number; market: Market }) {
  const cols = "grid grid-cols-[minmax(9rem,1.8fr)_repeat(2,minmax(5.5rem,1fr))_minmax(6.5rem,1fr)_minmax(4.5rem,0.8fr)_6.5rem] items-center gap-x-3";
  const buyable = funds.filter((f) => isScheduled(f.symbol));
  const daily = funds.filter((f) => !isScheduled(f.symbol));
  return (
    <>
    <div className="sm:hidden">
      <div role="radiogroup" aria-label="Fund" className="divide-y divide-hairline">
        {buyable.map((f) => {
          const active = f.address === value;
          const st = statusOf(f, now);
          return (
            <button
              key={f.address}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${f.symbol}, ${f.name}`}
              onClick={() => onChange(f)}
              className={cn("grid w-full grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-5 py-3.5 text-left", active && "bg-accent-soft shadow-[inset_2px_0_0_var(--color-accent)]")}
            >
              <span className="min-w-0">
                <span className="block font-semibold">{f.symbol}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">{displayName(f.name)}</span>
              </span>
              <span className="text-right">
                <Badge tone={st.tone}>
                  <span className="badge-dot" />
                  {st.label}
                </Badge>
              </span>
              <span className="t-caption">
                <Abbr k="NAV" /> <span className="num text-ink">{fmtNav(f.nav).replace("$", "")}</span> · pays after {fmtDuration(f.settlementDelay)}
              </span>
              <span className="t-caption text-right">
                bid <Bid f={f} now={now} market={market} /> · <Spread f={f} now={now} market={market} />
              </span>
            </button>
          );
        })}
      </div>
      {daily.length > 0 && (
        <>
          <GroupHead daily />
          <ul className="divide-y divide-hairline">
            {daily.map((f) => (
              <li key={f.address} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-5 py-3">
                <span className="min-w-0">
                  <span className="block font-semibold text-ink-2">{f.symbol}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">{displayName(f.name)}</span>
                </span>
                <span className="text-right">
                  <Badge tone="neutral">Redeem directly</Badge>
                </span>
                <span className="t-caption col-span-2">
                  <Abbr k="NAV" /> <span className="num text-ink">{fmtNav(f.nav).replace("$", "")}</span> · pays after {fmtDuration(f.settlementDelay)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
    <div className="hidden overflow-x-auto sm:block">
      <div className="min-w-[660px]">
        <div className={cn(cols, "border-b border-hairline bg-surface-2 px-5 py-2.5 text-[12px] font-medium text-muted")}>
          <span>Fund</span>
          <span className="text-right">
            <Abbr k="NAV" />
          </span>
          <span className="text-right">Pays after</span>
          <span className="text-right">Bid per unit</span>
          <span className="text-right">Spread</span>
          <span>Status</span>
        </div>
        {daily.length > 0 && <GroupHead />}
        <div role="radiogroup" aria-label="Fund">
          {buyable.map((f) => {
            const active = f.address === value;
            const st = statusOf(f, now);
            return (
              <button
                key={f.address}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`${f.symbol}, ${f.name}`}
                onClick={() => onChange(f)}
                className={cn(cols, "w-full border-b border-hairline px-5 py-3 text-left transition-colors last:border-0 hover:bg-surface-2", active && "bg-accent-soft shadow-[inset_2px_0_0_var(--color-accent)]")}
              >
                <span className="min-w-0">
                  <span className="block font-semibold">{f.symbol}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">{displayName(f.name)}</span>
                </span>
                <span className="num text-right">{fmtNav(f.nav).replace("$", "")}</span>
                <span className="num text-right">{fmtDuration(f.settlementDelay)}</span>
                <span className="text-right">
                  <Bid f={f} now={now} market={market} />
                </span>
                <span className="text-right">
                  <Spread f={f} now={now} market={market} />
                </span>
                <span>
                  <Badge tone={st.tone}>
                    <span className="badge-dot" />
                    {st.label}
                  </Badge>
                </span>
              </button>
            );
          })}
        </div>
        {daily.length > 0 && (
          <>
            <GroupHead daily />
            <ul>
              {daily.map((f) => (
                <li key={f.address} className={cn(cols, "border-b border-hairline px-5 py-3 last:border-0")}>
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink-2">{f.symbol}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">{displayName(f.name)}</span>
                  </span>
                  <span className="num text-right">{fmtNav(f.nav).replace("$", "")}</span>
                  <span className="num text-right">{fmtDuration(f.settlementDelay)}</span>
                  <span className="text-right text-[13px] text-muted">Not offered</span>
                  <span />
                  <span>
                    <Badge tone="neutral">Redeem directly</Badge>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
    </>
  );
}
