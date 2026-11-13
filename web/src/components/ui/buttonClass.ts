import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

/// Shared button classes, so links styled as buttons match exactly.
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  const v = {
    // Sky blue: the one action on a screen. BUY green stays for the verdict.
    primary: "bg-brand text-accent-ink hover:brightness-110 disabled:bg-sunk disabled:text-muted disabled:opacity-100 disabled:shadow-[inset_0_0_0_1px_var(--color-hairline)] disabled:hover:brightness-100",
    secondary: "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-surface-2",
    danger: "bg-halt-soft text-halt shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-halt)_30%,transparent)] hover:brightness-[0.98]",
    ghost: "bg-transparent text-brand hover:bg-sunk",
  }[variant];
  const s = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-[14px]", lg: "h-12 px-5 text-[15px]" }[size];
  return cn("pressable inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] font-medium disabled:cursor-not-allowed disabled:opacity-40", v, s);
}

