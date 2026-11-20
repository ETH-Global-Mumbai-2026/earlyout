import type { ReactNode } from "react";
import type { Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";
import { VerdictStamp } from "./VerdictStamp";

/// A quote laid out like a fund term sheet: a mono header, dashed-rule lines,
/// and the verdict stamped in the top corner.
export function TermSheet({
  header,
  aside,
  stamp,
  children,
  raised,
  className,
}: {
  header: ReactNode;
  aside?: ReactNode;
  stamp?: { verdict: Verdict; reason?: string };
  children: ReactNode;
  raised?: boolean;
  className?: string;
}) {
  return (
    <section className={cn("sheet relative px-5 pb-5 pt-4", raised && "sheet-raised", className)}>
      <header className="t-label flex items-baseline justify-between gap-3">
        <span className="min-w-0 break-words">{header}</span>
        {aside && <span className="shrink-0">{aside}</span>}
      </header>
      {stamp && <VerdictStamp verdict={stamp.verdict} reason={stamp.reason} className="absolute -top-3 right-4" />}
      <div className="mt-2">{children}</div>
    </section>
  );
}

/// One line of a term sheet. `neg` marks a deduction; `strong` a total.
export function TermLine({ label, value, tone, hint }: { label: ReactNode; value: ReactNode; tone?: "neg" | "strong"; hint?: ReactNode }) {
  return (
    <div className="rule-dashed flex items-baseline justify-between gap-4 py-2 text-[14px]">
      <span className={cn("min-w-0", tone === "strong" ? "font-medium text-ink" : "text-ink-2")}>
        {label}
        {hint && <span className="t-caption block">{hint}</span>}
      </span>
      <span className={cn("num shrink-0 text-right", tone === "neg" && "text-neg", tone === "strong" && "font-medium")}>{value}</span>
    </div>
  );
}
