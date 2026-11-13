"use client";

import { useState } from "react";
import { fundLogoFile } from "@/lib/fundLogo";
import { cn } from "@/lib/utils";

/// A fund's issuer logo on a small white tile, in its own colours in both
/// themes (issuer marks are drawn for light backgrounds). Falls back to a serif monogram
/// when the logo file is missing, so removing a logo is one file deletion.
export function FundMark({ symbol, size = 28, className }: { symbol: string; size?: number; className?: string }) {
  const [missing, setMissing] = useState(false);
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center overflow-hidden rounded-[4px] border border-hairline bg-white dark:border-transparent dark:bg-[#e8f1f8]", className)}
      style={{ width: size, height: size }}
    >
      {missing ? (
        <span className="font-serif leading-none text-[#0b1b2b]" style={{ fontSize: size * 0.6 }}>
          {symbol.slice(0, 1)}
        </span>
      ) : (
        // A plain <img>: these are small, local SVGs and next/image adds nothing here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/funds/${fundLogoFile(symbol)}`} alt="" className="max-h-[70%] max-w-[78%] object-contain" onError={() => setMissing(true)} />
      )}
    </span>
  );
}
