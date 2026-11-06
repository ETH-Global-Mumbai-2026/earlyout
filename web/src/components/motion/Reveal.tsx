"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/// Content rises into place once as it scrolls into view. A critically damped
/// spring (no overshoot), transform and opacity only; reduced motion fades.
export function Reveal({ children, delay = 0, y = 16, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, transform: `translateY(${y}px)` }}
      whileInView={{ opacity: 1, transform: "translateY(0px)" }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={reduce ? { duration: 0.2, delay } : { type: "spring", bounce: 0, duration: 0.7, delay }}
    >
      {children}
    </motion.div>
  );
}

/// Children enter one after another, 60ms apart.
export function Stagger({ children, className }: { children: ReactNode[]; className?: string }) {
  return (
    <div className={className}>
      {children.map((c, i) => (
        <Reveal key={i} delay={i * 0.06}>
          {c}
        </Reveal>
      ))}
    </div>
  );
}
