"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Verdict } from "@/lib/types";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

export function Button({ variant = "primary", size = "md", loading, disabled, className = "", children, ...rest }: ButtonProps) {
  const v = {
    primary: "bg-accent text-accent-ink",
    secondary: "bg-surface-2 text-ink",
    danger: "bg-halt text-white",
    ghost: "bg-transparent text-accent",
  }[variant];
  const s = { sm: "h-8 px-3 text-sm", md: "h-11 px-4 text-[15px]", lg: "h-13 px-5 text-[17px]" }[size];
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`pressable inline-flex items-center justify-center gap-2 rounded-full font-semibold disabled:opacity-45 ${v} ${s} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card p-5 ${className}`}>{children}</section>;
}

export function Stat({ label, value, hint, className = "" }: { label: string; value: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="t-caption">{label}</div>
      <div className="t-title tnum mt-0.5">{value}</div>
      {hint && <div className="t-caption mt-0.5">{hint}</div>}
    </div>
  );
}

export function Row({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <div>
        <div className="t-body">{label}</div>
        {hint && <div className="t-caption">{hint}</div>}
      </div>
      <div className="t-body tnum text-right font-medium">{value}</div>
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "success"; children: ReactNode }) {
  const c = {
    info: "bg-surface-2 text-ink",
    warn: "bg-refuse-soft text-ink",
    error: "bg-halt-soft text-ink",
    success: "bg-buy-soft text-ink",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`t-body rounded-[12px] px-4 py-3 ${c}`}>
      {children}
    </div>
  );
}

const verdictStyle: Record<Verdict, { bg: string; dot: string; word: string }> = {
  BUY: { bg: "bg-buy-soft", dot: "bg-buy", word: "The vault will buy" },
  REFUSE: { bg: "bg-refuse-soft", dot: "bg-refuse", word: "Refused" },
  HALT: { bg: "bg-halt-soft", dot: "bg-halt", word: "Halted" },
};

export function VerdictPill({ verdict, reason }: { verdict: Verdict; reason?: string }) {
  const s = verdictStyle[verdict];
  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 ${s.bg}`} aria-live="polite">
      <span className={`size-2 rounded-full ${s.dot}`} aria-hidden />
      <span className="text-sm font-semibold">{verdict}</span>
      <span className="t-caption">{reason || s.word}</span>
    </div>
  );
}

/// Fade-and-rise swap for a value that changes in place. Occasional tier, ease-out, under 250ms.
export function Swap({ k, children, className = "" }: { k: string; children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={k}
        className={className}
        initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(4px)" }}
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(-4px)" }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/// Bottom sheet for receipts. Enters and leaves through the bottom; a drawer-tier duration.
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            aria-label="Close"
            className="fixed inset-0 z-30 bg-black/30"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="card fixed inset-x-0 bottom-0 z-40 mx-auto max-w-xl rounded-b-none p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:bottom-6 sm:rounded-b-[18px]"
            initial={reduce ? { opacity: 0 } : { transform: "translateY(100%)" }}
            animate={reduce ? { opacity: 1 } : { transform: "translateY(0%)" }}
            exit={reduce ? { opacity: 0 } : { transform: "translateY(100%)" }}
            transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="mb-3 flex items-center justify-between">
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
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-surface-2 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`pressable relative rounded-full px-3.5 py-1.5 text-sm font-medium ${active ? "text-ink" : "text-muted"}`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${label}`}
                className="absolute inset-0 rounded-full bg-surface shadow-sm"
                transition={reduce ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.35 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
