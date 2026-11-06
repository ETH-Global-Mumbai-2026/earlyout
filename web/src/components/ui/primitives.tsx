"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

export function Button({ variant = "primary", size = "md", loading, disabled, className = "", children, ...rest }: ButtonProps) {
  const v = {
    primary: "border border-accent bg-accent text-accent-ink hover:bg-[#0077ed]",
    secondary: "border border-line-strong bg-surface text-ink-2 hover:bg-sunk",
    danger: "border border-halt bg-halt text-white hover:brightness-110",
    ghost: "border border-transparent bg-transparent text-accent hover:bg-accent-soft",
  }[variant];
  const s = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-sm", lg: "h-12 px-5 text-[16px]" }[size];
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn("pressable inline-flex items-center justify-center gap-2 rounded-xl font-medium disabled:cursor-not-allowed disabled:opacity-40", v, s, className)}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span aria-hidden className={cn("inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent", className)} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={cn("card p-5", className)}>{children}</section>;
}

/// A card with a titled header row and an optional note on the right.
export function Panel({ title, note, children, className = "", bodyClassName = "" }: { title: ReactNode; note?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("card min-w-0 overflow-hidden", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-3.5">
        <h2 className="t-headline">{title}</h2>
        {note && <div className="t-caption text-right">{note}</div>}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, className = "" }: { label: string; value: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="t-eyebrow">{label}</div>
      <div className="num mt-1 text-xl font-semibold">{value}</div>
      {hint && <div className="t-caption mt-0.5">{hint}</div>}
    </div>
  );
}

export function Row({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <div className="min-w-0">
        <div className="text-[13px]">{label}</div>
        {hint && <div className="t-caption">{hint}</div>}
      </div>
      <div className="num tnum text-right text-[13px] font-medium">{value}</div>
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "success"; children: ReactNode }) {
  const c = {
    info: "border-hairline bg-surface-2 text-ink-2",
    warn: "border-refuse/30 bg-refuse-soft text-ink",
    error: "border-halt/30 bg-halt-soft text-ink",
    success: "border-buy/30 bg-buy-soft text-ink",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-[13px]", c)}>
      {children}
    </div>
  );
}

const verdictStyle: Record<Verdict, { cls: string; word: string }> = {
  BUY: { cls: "bg-buy-soft text-buy", word: "The vault will buy" },
  REFUSE: { cls: "bg-refuse-soft text-refuse", word: "Refused" },
  HALT: { cls: "bg-halt-soft text-halt", word: "Halted" },
};

/// Verdict as a status badge: the word, then the reason. Never colour alone.
export function VerdictPill({ verdict, reason }: { verdict: Verdict; reason?: string }) {
  const s = verdictStyle[verdict];
  return (
    <span className="inline-flex flex-wrap items-center gap-2" aria-live="polite">
      <span className={cn("badge font-semibold tracking-wide", s.cls)}>
        <span className="badge-dot" />
        {verdict}
      </span>
      <span className="t-caption">{reason || s.word}</span>
    </span>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "good" | "warn" | "bad" | "accent"; children: ReactNode }) {
  const c = {
    neutral: "bg-sunk text-ink-2",
    good: "bg-buy-soft text-buy",
    warn: "bg-refuse-soft text-refuse",
    bad: "bg-halt-soft text-halt",
    accent: "bg-accent-soft text-accent",
  }[tone];
  return <span className={cn("badge", c)}>{children}</span>;
}

/// Fade swap for a value that changes in place. Short and quiet.
export function Swap({ k, children, className = "" }: { k: string; children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={k}
        className={className}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0 : 0.14 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/// Confirmation dialog for receipts. Centered, no bounce.
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            aria-label="Close"
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="card fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md p-6 shadow-[var(--shadow-float)] sm:inset-x-0 sm:bottom-auto sm:top-[28%]"
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(24px) scale(0.98)" }}
            animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(24px) scale(0.98)" }}
            transition={reduce ? { duration: 0.15 } : { type: "spring", bounce: 0, duration: 0.4 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="t-headline">{title}</h2>
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
  return (
    <div role="radiogroup" aria-label={label} className="relative inline-grid auto-cols-fr grid-flow-col rounded-[10px] bg-sunk p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn("pressable relative rounded-[8px] px-3.5 py-1.5 text-[13px] font-medium", active ? "text-ink" : "text-muted hover:text-ink")}
          >
            {active && (
              <motion.span
                layoutId={`seg-${label}`}
                className="absolute inset-0 rounded-[8px] bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.04)]"
                transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
