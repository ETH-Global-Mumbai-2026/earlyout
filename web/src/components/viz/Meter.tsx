import { cn } from "@/lib/utils";

/// A status meter: the fill carries severity, the track is a lighter step of the
/// same colour, and the state is always written out beside it.
export function Meter({ value, max, label, valueText, className }: { value: number; max: number; label: string; valueText: string; className?: string }) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const tone = ratio >= 1 ? "var(--color-halt)" : ratio >= 0.75 ? "var(--color-refuse)" : "var(--color-buy)";
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="t-caption">{label}</span>
        <span className="text-[13px] font-medium tnum">{valueText}</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(value, max)}
        aria-valuetext={valueText}
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full"
        style={{ background: `color-mix(in srgb, ${tone} 18%, transparent)` }}
      >
        <div className={cn("h-full rounded-full transition-[width] duration-500 ease-out")} style={{ width: `${ratio * 100}%`, background: tone }} />
      </div>
    </div>
  );
}
