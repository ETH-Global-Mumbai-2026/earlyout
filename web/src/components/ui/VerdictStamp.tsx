"use client";

import { motion, useReducedMotion } from "motion/react";
import type { Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE: Record<Verdict, string> = {
  BUY: "border-buy text-buy",
  REFUSE: "border-refuse text-refuse",
  HALT: "border-halt text-halt",
};

/// The verdict as a rubber stamp on a term sheet. The word is always written,
/// never colour alone; the reason sits in the title for pointer users and
/// is spoken by screen readers.
export function VerdictStamp({ verdict, reason, animate = true, className }: { verdict: Verdict; reason?: string; animate?: boolean; className?: string }) {
  // Reduced motion only shortens the transition: the starting style stays the
  // same as the server render, so hydration matches.
  const reduce = useReducedMotion();
  return (
    <motion.span
      key={verdict}
      role="status"
      aria-label={reason ? `${verdict}: ${reason}` : verdict}
      title={reason}
      className={cn(
        "inline-block rotate-[7deg] select-none rounded-[3px] border-[1.5px] bg-surface px-2 py-0.5 font-mono text-[11px] font-medium tracking-[0.12em]",
        TONE[verdict],
        className,
      )}
      initial={animate ? { opacity: 0, scale: 1.5 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={reduce ? { duration: 0 } : { duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
    >
      {verdict}
    </motion.span>
  );
}
