"use client";

import { ArrowUpRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { FundMark } from "../brand/FundMark";
import { useFunds, useQuote } from "@/hooks/useEarlyout";
import { COPY } from "@/lib/copy";
import { fmtDuration, fmtNav, fmtUsdc } from "@/lib/format";
import { CATALOG, isScheduled, type CatalogFund } from "@/lib/glossary";
import { HERO_PROBE, perUnitQuote } from "@/lib/perUnit";
import type { Fund } from "@/lib/types";

const C = COPY.home.funds;

/// The fund list on the home page: the funds Earlyout buys first, the
/// daily-liquidity funds folded under "Also priced".
export function SiteFunds() {
  const funds = useFunds().data;
  const [open, setOpen] = useState(false);
  const live = (symbol: string) => funds?.find((f) => f.symbol === symbol);
  const buyable = CATALOG.filter((c) => isScheduled(c.symbol));
  const daily = CATALOG.filter((c) => !isScheduled(c.symbol));

  return (
    <div className="w-full max-w-full overflow-hidden border-y border-ink [contain:inline-size]">
      <div className="relative w-full max-w-full overflow-x-auto">
        <table className="tbl min-w-[820px]" aria-label="Funds">
          <thead>
            <tr>
              <th>Fund</th>
              <th>Holds</th>
              <th>Issuer</th>
              <th className="r">NAV</th>
              <th className="r">Bid, per unit</th>
              <th className="r">Pays in</th>
              <th className="r">
                <span className="sr-only">{C.feedLink}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {buyable.map((c) => (
              <FundRow key={c.symbol} c={c} fund={live(c.symbol)} loaded={!!funds} buy />
            ))}
          </tbody>
          <tbody>
            <tr>
              <td colSpan={7} className="!p-0">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls="also-priced"
                  onClick={() => setOpen((o) => !o)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[13px] text-ink-2 hover:bg-surface-2"
                >
                  <span>
                    <span className="t-label">{C.alsoPriced}</span>
                    <span className="ml-3 text-muted">{daily.length} daily-liquidity funds</span>
                  </span>
                  <ChevronDown size={16} aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
              </td>
            </tr>
          </tbody>
          <tbody id="also-priced" hidden={!open}>
            {daily.map((c) => (
              <FundRow key={c.symbol} c={c} fund={live(c.symbol)} loaded={!!funds} />
            ))}
            <tr>
              <td colSpan={7} className="!whitespace-normal text-[13px] text-muted">
                {C.alsoPricedNote}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FundRow({ c, fund, buy, loaded }: { c: CatalogFund; fund?: Fund; buy?: boolean; loaded: boolean }) {
  const none = <span className="text-[12px] text-muted">{loaded ? "Not in demo" : "…"}</span>;
  return (
    <tr className={buy ? undefined : "text-ink-2"}>
      <td className="!whitespace-normal">
        <span className="flex items-center gap-3">
          <FundMark symbol={c.symbol} size={28} />
          <span>
            <span className="block font-medium text-ink">{c.symbol}</span>
            <span className="block max-w-[16rem] text-[13px] text-muted">{c.name}</span>
          </span>
        </span>
      </td>
      <td className="!whitespace-normal">{c.holds}</td>
      <td className="!whitespace-normal text-muted">{c.issuer}</td>
      <td className="r num">{fund ? fmtNav(fund.nav) : none}</td>
      <td className="r num">{!fund && loaded ? none : buy ? <Bid fund={fund} /> : <span className="text-muted">Not bought</span>}</td>
      <td className="r num">{fund ? fmtDuration(fund.settlementDelay) : none}</td>
      <td className="r">
        <a
          href={`https://etherscan.io/address/${c.feed}#readProxyContract`}
          target="_blank"
          rel="noreferrer"
          aria-label={`${c.symbol} ${C.feedLink}`}
          title={c.feed}
          className="inline-grid size-7 place-items-center rounded-[4px] text-muted hover:bg-sunk hover:text-ink"
        >
          <ArrowUpRight size={14} aria-hidden />
        </a>
      </td>
    </tr>
  );
}

function Bid({ fund }: { fund?: Fund }) {
  const q = useQuote(fund?.address, fund ? HERO_PROBE : null).data;
  if (!q) return <>…</>;
  if (q.verdict !== "BUY") return <span className="text-muted">{q.verdict}</span>;
  return <span className="font-medium text-ink">{fmtUsdc(perUnitQuote(q, HERO_PROBE).payout)}</span>;
}
