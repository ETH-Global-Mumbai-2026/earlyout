"use client";

import { useFunds, useVault } from "@/hooks/useEarlyout";
import { useNow } from "@/hooks/useNow";
import { fmtDuration, fmtNav, fmtUsdc } from "@/lib/format";
import { Abbr } from "./ui/Abbr";
import type { ReactNode } from "react";

/// The desk's live strip: the numbers a trader checks before acting.
export function RiskStrip() {
  const funds = useFunds();
  const vault = useVault();
  const now = useNow();
  const lead = funds.data?.[0];
  const failed = funds.data?.some((f) => f.status === 1 || f.impaired) ?? false;
  const v = vault.data;
  const util = v && v.totalAssets > 0n ? Number((v.deployed * 10000n) / v.totalAssets) / 100 : 0;
  const items: [string, ReactNode, string, string?][] = [];
  if (lead) {
    items.push(["nav", <>{lead.symbol} <Abbr k="NAV" /></>, fmtNav(lead.nav).replace("$", "")]);
    items.push(["age", "Price age", `${fmtDuration(Math.max(0, now - lead.navUpdatedAt))} of ${fmtDuration(lead.maxAge)}`]);
  }
  items.push(["issuer", "Issuer", funds.data ? (failed ? "FAILED" : "OK") : "…", failed ? "text-halt" : "text-buy"]);
  if (v) {
    items.push(["tvl", "Vault deposits", `${fmtUsdc(v.totalAssets).replace("$", "")} USDC`]);
    items.push(["util", "Deployed", `${util.toFixed(1)}%`]);
    items.push(["lp", <>Liquidity provider (<Abbr k="LP" />) share price</>, fmtUsdc(v.sharePrice, true).replace("$", "")]);
  }
  return (
    <div className="material border-b border-hairline" aria-label="Live market data">
      <div className="mx-auto flex max-w-[1320px] gap-7 overflow-x-auto whitespace-nowrap px-4 py-2.5 text-[12px] text-muted sm:px-6">
        <span className="inline-flex items-center gap-1.5 font-medium text-ink-2">
          <span className={`size-1.5 rounded-full ${failed ? "bg-halt" : "bg-buy"}`} />
          Live
        </span>
        {items.map(([k, label, val, cls]) => (
          <span key={k}>
            {label} <span className={`num font-semibold ${cls ?? "text-ink"}`}>{val}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
