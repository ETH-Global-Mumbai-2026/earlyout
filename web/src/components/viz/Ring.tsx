/// iOS activity-style ring: a round-capped arc over a faint track of the same
/// colour. The figure sits in the middle; the arc eases when the value changes.
export function Ring({
  value,
  max,
  size = 64,
  stroke = 8,
  color = "var(--color-accent)",
  label,
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string;
  label: string;
  children?: React.ReactNode;
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} style={{ stroke: `color-mix(in srgb, ${color} 18%, transparent)` }} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(ratio, 0.002))}
          style={{ stroke: color, transition: "stroke-dashoffset 600ms cubic-bezier(0.32, 0.72, 0, 1)" }}
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center text-center">{children}</div>}
    </div>
  );
}

export function toneColor(ratio: number) {
  return ratio >= 1 ? "var(--color-halt)" : ratio >= 0.75 ? "var(--color-refuse)" : "var(--color-dot-buy)";
}
