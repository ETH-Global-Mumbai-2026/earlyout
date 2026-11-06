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
  // An iOS form row: the label on the left, the figure typed on the right. It
  // sits inside an .ios-group, with the Max shortcut under the figure.
  return (
    <div className="ios-row min-h-[60px]">
      <label htmlFor={id} className="shrink-0 text-[17px]">
        {label}
      </label>
      <div className="min-w-0 flex-1 text-right">
        <div className="flex items-baseline justify-end gap-1.5">
          <input
            id={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            placeholder="0"
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
            className="tnum min-w-0 flex-1 bg-transparent text-right text-[22px] font-semibold outline-none placeholder:text-faint"
            aria-label={`${label} in ${unit}`}
          />
          <span className="text-[17px] text-muted" aria-hidden>
            {unit}
          </span>
        </div>
        {balance !== undefined && (
          <button
            type="button"
            className="pressable text-[13px] text-accent"
            onClick={() => onChange(formatFull(balance, decimals))}
            aria-label={`Use maximum, ${fmtUnits(balance, decimals)} ${unit}`}
          >
            Max {fmtUnits(balance, decimals)}
          </button>
        )}
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
