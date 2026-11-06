"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/// Width of an element, tracked with ResizeObserver, so charts draw in real pixels
/// (text never stretches) and reflow from phone to desktop.
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

/// The four spread terms in their fixed palette order. Never reordered, never cycled.
export const TERM_COLORS = ["var(--color-viz-1)", "var(--color-viz-2)", "var(--color-viz-3)", "var(--color-viz-4)"] as const;
/// Text set inside a filled block: white on blue and orange, near-black on aqua and yellow.
export const TERM_INK = ["#ffffff", "#ffffff", "#ffffff", "#ffffff"] as const;
export const TERM_NAMES = ["Base", "Vault usage", "Time to payout", "Issuer credit"] as const;

/// Value first, label second; a short line key in the series colour.
export function Tooltip({ x, y, children, align = "center" }: { x: number; y: number; children: ReactNode; align?: "center" | "left" | "right" }) {
  const shift = align === "center" ? "-50%" : align === "left" ? "0%" : "-100%";
  return (
    <div
      role="status"
      className="material pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-hairline px-2.5 py-1.5 text-xs shadow-lg"
      style={{ left: x, top: y, transform: `translate(${shift}, calc(-100% - 8px))` }}
    >
      {children}
    </div>
  );
}

export function TableToggle({ caption, head, rows, className }: { caption: string; head: string[]; rows: (string | number)[][]; className?: string }) {
  return (
    <details className={cn("group mt-2", className)}>
      <summary className="t-caption cursor-pointer list-none select-none hover:text-ink">
        <span className="group-open:hidden">Show as table</span>
        <span className="hidden group-open:inline">Hide table</span>
      </summary>
      <table className="mt-2 w-full text-left text-xs tnum">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-muted">
            {head.map((h) => (
              <th key={h} className="py-1 pr-4 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-hairline">
              {r.map((c, j) => (
                <td key={j} className="py-1 pr-4">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
