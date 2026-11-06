import { cn } from "@/lib/utils";

/// The Earlyout mark: a clock face whose hand leaves through a gap in the dial at
/// three o'clock. Leaving before the schedule ends is the whole product.
export function LogoMark({ className, title = "Earlyout" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" role="img" aria-label={title} className={cn("size-7 shrink-0", className)}>
      <rect width="32" height="32" rx="7" className="fill-brand" />
      <path d="M20.55 11.41A8 8 0 1 0 20.55 20.59" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M14 16V11" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M14 16H26.5M23.4 12.9L26.5 16L23.4 19.1" stroke="#7AA7FF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[17px] font-semibold leading-none tracking-[-0.01em] text-brand dark:text-ink">Earlyout</span>
    </span>
  );
}
