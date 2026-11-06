"use client";

import type { Fund } from "@/lib/types";
import { fmtNav, timeUntil } from "@/lib/format";
import { useNow } from "@/hooks/useNow";

export function FundPicker({ funds, value, onChange }: { funds: Fund[]; value?: string; onChange: (f: Fund) => void }) {
  const now = useNow();
  return (
    <div role="radiogroup" aria-label="Fund" className="grid gap-2 sm:grid-cols-2">
      {funds.map((f) => {
        const active = f.address === value;
        const bad = f.status === 1 || f.impaired;
        return (
          <button
            key={f.address}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(f)}
            className={`pressable card flex flex-col items-start gap-1 p-4 text-left ${active ? "ring-2 ring-accent" : ""}`}
          >
            <div className="flex w-full items-center justify-between">
              <span className="t-headline">{f.symbol}</span>
              <span className={`size-2 rounded-full ${bad ? "bg-halt" : "bg-buy"}`} aria-label={bad ? "Issuer failed" : "Issuer OK"} />
            </div>
            <span className="t-caption line-clamp-1">{f.name}</span>
            <span className="t-body tnum mt-1">
              NAV {fmtNav(f.nav)} <span className="text-muted">· pays in {timeUntil(now + f.settlementDelay, now)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
