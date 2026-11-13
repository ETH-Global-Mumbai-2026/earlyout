"use client";

import { useBook } from "@/hooks/useBook";
import { useVault } from "@/hooks/useEarlyout";
import { COPY } from "@/lib/copy";
import { fmtBps, fmtUsdc } from "@/lib/format";
import { expectedReturn } from "@/lib/metrics";

/// The vault right now: a compact band of figures, sized to the numbers.
export function VaultFigures() {
  const v = useVault().data;
  const book = useBook().data;
  const open = (book?.claims ?? []).filter((c) => c.status === "open");
  const cost = open.reduce((s, c) => s + BigInt(c.usdcPaid), 0n);
  const value = open.reduce((s, c) => s + (BigInt(c.amount) * BigInt(c.nav)) / 10n ** 30n, 0n);
  const ret = expectedReturn(cost, value, 0);
  const deployed = v && v.totalAssets ? Number((v.deployed * 10_000n) / v.totalAssets) : 0;
  const cells: [string, string][] = [
    ["Share price", v ? fmtUsdc(v.sharePrice, true) : "…"],
    ["Total assets", v ? fmtUsdc(v.totalAssets) : "…"],
    ["Idle USDC", v ? fmtUsdc(v.idle) : "…"],
    ["Deployed", v ? fmtBps(deployed) : "…"],
    [COPY.figures.expectedReturn, book ? `${fmtUsdc(ret.profit, true)} · ${fmtBps(ret.bps)}` : "…"],
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden border-y border-hairline bg-hairline sm:grid-cols-3 lg:grid-cols-5 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
      {cells.map(([k, val]) => (
        <div key={k} className="bg-canvas px-4 py-5">
          <dt className="t-label">{k}</dt>
          <dd className="t-figure mt-2 text-[1.75rem] leading-none">{val}</dd>
        </div>
      ))}
    </dl>
  );
}
