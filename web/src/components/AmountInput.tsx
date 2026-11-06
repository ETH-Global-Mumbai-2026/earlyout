"use client";

import { useId } from "react";
import { fmtUnits } from "@/lib/format";

export function AmountInput({
  value,
  onChange,
  unit,
  balance,
  decimals = 18,
  label = "Amount",
}: {
  value: string;
  onChange: (v: string) => void;
  unit: string;
  balance?: bigint;
  decimals?: number;
  label?: string;
}) {
  const id = useId();
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={id} className="t-caption">
          {label}
        </label>
        {balance !== undefined && (
          <button
            type="button"
            className="t-caption pressable text-accent"
            onClick={() => onChange(formatFull(balance, decimals))}
            aria-label={`Use maximum, ${fmtUnits(balance, decimals)} ${unit}`}
          >
            Max {fmtUnits(balance, decimals)}
          </button>
        )}
      </div>
      <div className="control flex items-center gap-2 px-4 py-3">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
          className="t-title tnum flex-1"
          aria-label={`${label} in ${unit}`}
        />
        <span className="t-headline text-muted" aria-hidden>
          {unit}
        </span>
      </div>
    </div>
  );
}

function formatFull(v: bigint, decimals: number) {
  const s = v.toString().padStart(decimals + 1, "0");
  const int = s.slice(0, -decimals);
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return frac ? `${int}.${frac}` : int;
}
