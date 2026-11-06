"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/// A figure that counts to its value once, on first view. Ease-out, under a second.
export function CountUp({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(value * 0.92, value, { duration: 0.9, ease: [0.23, 1, 0.32, 1], onUpdate: setShown });
    return () => controls.stop();
  }, [inView, reduce, value]);
  return (
    <span ref={ref} className={className}>
      {format(inView && !reduce ? shown : value)}
    </span>
  );
}
