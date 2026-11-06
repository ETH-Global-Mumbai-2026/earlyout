import { Ring, toneColor } from "./Ring";

/// A status meter as an iOS ring: the arc's colour carries severity (green,
/// orange near the limit, red at it) and the state is always written beside it.
export function Meter({ value, max, label, valueText, className }: { value: number; max: number; label: string; valueText: string; className?: string }) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div className={`flex items-center gap-4 ${className ?? ""}`} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)} aria-valuetext={valueText}>
      <Ring value={value} max={max} size={60} stroke={7} color={toneColor(ratio)} label={`${label}: ${valueText}`}>
        <span className="num text-[13px] font-semibold">{Math.round(ratio * 100)}%</span>
      </Ring>
      <div className="min-w-0">
        <div className="text-[15px] font-semibold tnum">{valueText}</div>
        <div className="t-caption">{label}</div>
      </div>
    </div>
  );
}
