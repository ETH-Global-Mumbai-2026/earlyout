"use client";

import { Check, ChevronRight } from "lucide-react";
import { fmtBps, fmtDuration, fmtNav, fmtUsdc } from "@/lib/format";
import { displayName, isScheduled } from "@/lib/glossary";
import { indicativeBid } from "@/lib/pricing";
import type { Fund } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Abbr } from "./ui/Abbr";
import { Badge } from "./ui/primitives";

type Market = { baseBps: number; utilBps: number } | undefined;

function statusOf(f: Fund, now: number): { tone: "good" | "warn" | "bad"; label: string } | null {
  if (f.impaired) return { tone: "bad", label: "Impaired" };
  if (f.status === 1) return { tone: "bad", label: "Halted" };
  if (now - f.navUpdatedAt > f.maxAge) return { tone: "warn", label: "Stale NAV" };
  return null;
}

const ICON: Record<string, string> = { ACRED: "var(--color-accent)", ACREDd: "var(--color-brand-2)" };

function FundIcon({ f, muted }: { f: Fund; muted?: boolean }) {
  return (
    <span aria-hidden className="ios-icon" style={{ background: muted ? "var(--color-muted)" : (ICON[f.symbol] ?? "var(--color-accent)") }}>
      {f.symbol.slice(0, 1)}
    </span>
  );
}

/// The funds as an iOS inset grouped list. Funds that redeem on a schedule are
/// choices (radio rows); funds that already pay within days follow as a dimmed
/// comparison group that cannot be picked.
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
  /// "buyable" or "daily" renders one group, so a phone layout can put the sale form between them.
  show?: "all" | "buyable" | "daily";
}) {
  const buyable = show === "daily" ? [] : funds.filter((f) => isScheduled(f.symbol));
  const daily = show === "buyable" ? [] : funds.filter((f) => !isScheduled(f.symbol));
  return (
    <div>
      {buyable.length > 0 && (
      <>
      <div role="radiogroup" aria-label="Fund" className="ios-group [--inset:58px]">
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
              className={cn("ios-row w-full text-left transition-colors hover:bg-surface-2", active && "bg-accent-soft/50")}
            >
              <FundIcon f={f} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-[17px] font-semibold">{f.symbol}</span>
                  {st && (
                    <Badge tone={st.tone}>
                      <span className="badge-dot" />
                      {st.label}
                    </Badge>
                  )}
                </span>
                <span className="block text-[14px] leading-snug text-ink-2">{displayName(f.name)}</span>
                <span className="block text-[13px] text-muted">Pays in {fmtDuration(f.settlementDelay)}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="num block text-[17px] font-semibold">{bid ? fmtUsdc(bid.perUnit).replace("$", "") : "…"}</span>
                <span className="block text-[13px] text-muted">{bid ? `${fmtBps(bid.spreadBps)} spread` : ""}</span>
              </span>
              {active ? <Check size={20} strokeWidth={2.5} className="shrink-0 text-accent" aria-hidden /> : <ChevronRight size={18} className="shrink-0 text-faint" aria-hidden />}
            </button>
          );
        })}
      </div>
      <p className="ios-footer">
        Bid per unit from the vault, priced from each fund&apos;s Chainlink net asset value (<Abbr k="NAV" />).
      </p>
      </>
      )}

      {daily.length > 0 && (
        <>
          <div className={cn("ios-header", buyable.length > 0 && "mt-6")}>Daily-liquidity funds, for comparison</div>
          <ul className="ios-group [--inset:58px]">
            {daily.map((f) => (
              <li key={f.address} className="ios-row">
                <FundIcon f={f} muted />
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold text-ink-2">{f.symbol}</span>
                  <span className="block text-[14px] leading-snug text-ink-2">{displayName(f.name)}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="num block text-[16px] text-ink-2">{fmtNav(f.nav).replace("$", "")}</span>
                  <span className="block text-[13px] text-muted">Redeem directly</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="ios-footer">They already pay within days, so there is nothing to sell early. Shown with their live Chainlink prices.</p>
        </>
      )}
    </div>
  );
}
