import { cn } from "@/lib/utils";

/// The Earlyout mark: a clock face whose hand leaves through a gap in the dial
/// at three o'clock. Leaving before the schedule ends is the whole product.
/// Drawn in ink with a green way out, fine strokes to sit beside the serif.
export function LogoMark({ className, title = "Earlyout" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" role="img" aria-label={title} className={cn("size-7 shrink-0 text-ink", className)}>
      <path d="M22.4 10.6A9 9 0 1 0 22.4 21.4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M14.5 16V10.25" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M14.5 16H28.5M25.25 12.75L28.5 16L25.25 19.25" className="stroke-brand" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-[16px] font-semibold leading-none tracking-[-0.015em] text-ink">Earlyout</span>
    </span>
  );
}
