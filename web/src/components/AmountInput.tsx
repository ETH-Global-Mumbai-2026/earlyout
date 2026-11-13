"use client";

import { useId } from "react";
import { fmtUnits } from "@/lib/format";

/// An amount field like the figure box on a term sheet: the number large in
/// the display serif, the unit and the holding in mono beside it.
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
    <div className="control px-3.5 pb-2.5 pt-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="t-label">
          {label}
        </label>
        {balance !== undefined && (
          <button
            type="button"
            className="pressable t-label !text-brand hover:underline"
            onClick={() => onChange(formatFull(balance, decimals))}
            aria-label={`Use maximum, ${fmtUnits(balance, decimals)} ${unit}`}
          >
            Max {fmtUnits(balance, decimals)}
          </button>
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
          className="t-figure min-w-0 flex-1 bg-transparent text-[32px] leading-[1.1] outline-none placeholder:text-faint"
          aria-label={`${label} in ${unit}`}
        />
        <span className="font-mono text-[12px] text-muted" aria-hidden>
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
