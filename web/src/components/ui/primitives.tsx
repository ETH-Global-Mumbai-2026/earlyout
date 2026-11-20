"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { buttonClass } from "./buttonClass";

export { buttonClass };

const EASE = [0.23, 1, 0.32, 1] as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

export function Button({ variant = "primary", size = "md", loading, disabled, className = "", children, ...rest }: ButtonProps) {
  return (
    <button type="button" {...rest} disabled={disabled || loading} aria-busy={loading || undefined} className={cn(buttonClass(variant, size), className)}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span aria-hidden className={cn("inline-block size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent", className)} />;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "success"; children: ReactNode }) {
  const c = {
    info: "border-hairline bg-surface-2 text-ink-2",
    warn: "border-refuse/35 bg-refuse-soft text-ink",
    error: "border-halt/35 bg-halt-soft text-ink",
    success: "border-buy/35 bg-buy-soft text-ink",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-[4px] border px-4 py-3 text-[14px] leading-relaxed", c)}>
      {children}
    </div>
  );
}

/// A centred dialog (a bottom sheet on phones). Escape and the backdrop close it.
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  // Callers pass a fresh onClose each render; reading it through a ref keeps
  // the effect tied to `open` alone, so a re-render never moves focus.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close.current();
      if (e.key !== "Tab" || !panel.current) return;
      // Keep Tab inside the dialog while it is open.
      const items = [...panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex='-1'])")];
      // Moved by hand on every Tab, so it cycles the same in every browser
      // (Safari's default Tab skips buttons and would leave the dialog).
      e.preventDefault();
      if (items.length === 0) return;
      const at = items.indexOf(document.activeElement as HTMLElement);
      const next = at === -1 ? (e.shiftKey ? items.length - 1 : 0) : (at + (e.shiftKey ? -1 : 1) + items.length) % items.length;
      items[next].focus();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            aria-label="Close"
            tabIndex={-1}
            className="fixed inset-0 z-40 bg-[#16130e]/35"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
          <motion.div
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="sheet fixed inset-x-2 bottom-2 z-50 mx-auto max-w-md p-6 shadow-[var(--shadow-float)] outline-none sm:inset-x-0 sm:bottom-auto sm:top-[22%]"
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(16px) scale(0.98)" }}
            animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(8px) scale(0.99)", transition: { duration: 0.14 } }}
            transition={{ duration: reduce ? 0.12 : 0.26, ease: EASE }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="t-title">{title}</h2>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  const reduce = useReducedMotion();
  return (
    <div role="radiogroup" aria-label={label} className="relative inline-grid max-w-full auto-cols-fr grid-flow-col overflow-x-auto rounded-[6px] bg-sunk p-[3px]">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn("pressable relative whitespace-nowrap rounded-[4px] px-3.5 py-1.5 text-[13px] font-medium", active ? "text-ink" : "text-muted hover:text-ink")}
          >
            {active && (
              <motion.span
                layoutId={`seg-${label}`}
                className="absolute inset-0 rounded-[4px] bg-surface shadow-[0_0_0_1px_var(--color-hairline),0_1px_2px_rgba(40,30,10,0.08)]"
                transition={reduce ? { duration: 0 } : { duration: 0.22, ease: EASE }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
