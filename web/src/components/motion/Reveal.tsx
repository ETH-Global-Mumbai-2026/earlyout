"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.23, 1, 0.32, 1] as const;

const INSTANT = { duration: 0 } as const;

/// Fades and lifts content in the first time it scrolls into view. With reduced
/// motion it appears at once. The server and the first client render are the
/// same element with the same starting style, so hydration never leaves it
/// stuck invisible; only the transition differs.
export function Reveal({ children, className, delay = 0, y = 12 }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, transform: `translateY(${y}px)` }}
      whileInView={{ opacity: 1, transform: "translateY(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={reduce ? INSTANT : { duration: 0.5, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/// Reveals its StaggerItem children in order once in view. `step` is the gap
/// between items in seconds; keep it short in the app (0.05) and longer only
/// where the sequence explains something (the hero).
export function Stagger({ children, className, step = 0.05, delay = 0, as = "div" }: { children: ReactNode; className?: string; step?: number; delay?: number; as?: "div" | "ul" | "ol" }) {
  const reduce = useReducedMotion();
  const Tag = as === "ul" ? motion.ul : as === "ol" ? motion.ol : motion.div;
  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ hidden: {}, shown: { transition: reduce ? INSTANT : { staggerChildren: step, delayChildren: delay } } }}
    >
      {children}
    </Tag>
  );
}

export function StaggerItem({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" }) {
  const reduce = useReducedMotion();
  const Tag = as === "li" ? motion.li : motion.div;
  return (
    <Tag
      className={className}
      variants={{
        hidden: { opacity: 0, transform: "translateY(8px)" },
        shown: { opacity: 1, transform: "translateY(0px)", transition: reduce ? INSTANT : { duration: 0.32, ease: EASE } },
      }}
    >
      {children}
    </Tag>
  );
}
