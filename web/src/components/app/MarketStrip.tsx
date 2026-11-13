"use client";

import type { ReactNode } from "react";
import type { NavGroup } from "./nav";
import { useFunds, useVault } from "@/hooks/useEarlyout";
import { useNow } from "@/hooks/useNow";
import { fmtBps, fmtDuration, fmtNav, fmtUsdc } from "@/lib/format";

/// Live figures for the screen in view. Holders see the price and its health;
/// liquidity and market screens add the vault's size, usage and share price.
export function MarketStrip({ scope }: { scope: NavGroup }) {
  const funds = useFunds().data;
  const v = useVault().data;
  const now = useNow();
  const lead = funds?.find((f) => f.symbol === "ACRED") ?? funds?.[0];
  const failed = funds?.some((f) => f.status === 1 || f.impaired) ?? false;
  const deployed = v && v.totalAssets > 0n ? Number((v.deployed * 10_000n) / v.totalAssets) : 0;
  const items: [string, ReactNode, string, string?][] = [];
  if (lead) {
    items.push(["nav", `${lead.symbol} price`, fmtNav(lead.nav)]);
    items.push(["age", "Updated", `${fmtDuration(Math.max(0, now - lead.navUpdatedAt))} ago`]);
  }
  items.push(["issuer", "Funds", funds ? (failed ? "Problem reported" : "All healthy") : "…", failed ? "text-halt" : "text-buy"]);
  if (v && scope !== "Holders" && scope !== "Platforms") {
    items.push(["tvl", "Pool size", fmtUsdc(v.totalAssets)]);
    items.push(["util", "In use", fmtBps(deployed)]);
  }
  if (v && scope === "Liquidity") items.push(["share", "Share price", fmtUsdc(v.sharePrice, true)]);

  return (
    <div aria-label="Live market data" role="group" className="flex min-w-0 items-center gap-6 overflow-x-auto whitespace-nowrap font-mono text-[11px] text-muted [scrollbar-width:none]">
      <span className="inline-flex items-center gap-1.5 text-ink-2">
        <span className={`size-1.5 rounded-full ${failed ? "bg-halt" : "bg-buy"}`} aria-hidden />
        LIVE
      </span>
      {items.map(([k, label, val, cls]) => (
        <span key={k} className="uppercase tracking-[0.04em]">
          {label} <span className={`num ml-1 normal-case tracking-normal ${cls ?? "text-ink"}`}>{val}</span>
        </span>
      ))}
    </div>
  );
}
