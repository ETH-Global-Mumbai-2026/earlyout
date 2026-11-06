import { fmtUsdc } from "@/lib/format";

/// Thin segmented bar: one whole (the vault), split into idle USDC and USDC in claims.
export function Allocation({ idle, deployed, className }: { idle: bigint; deployed: bigint; className?: string }) {
  const total = idle + deployed;
  const pIdle = total > 0n ? Number((idle * 10000n) / total) / 100 : 100;
  const pDep = 100 - pIdle;
  const parts = [
    { name: "Idle USDC", value: idle, pct: pIdle, color: "var(--color-viz-1)" },
    { name: "In claims", value: deployed, pct: pDep, color: "var(--color-viz-3)" },
  ];
  return (
    <div className={className}>
      <div
        role="img"
        aria-label={`Vault allocation: ${parts.map((p) => `${p.name} ${fmtUsdc(p.value)}, ${p.pct.toFixed(1)}%`).join("; ")}`}
        className="flex h-2 w-full min-w-[120px] gap-[2px]"
      >
        {parts
          .filter((p) => p.pct > 0)
          .map((p) => (
            <div key={p.name} className="h-full rounded-full" style={{ width: `${p.pct}%`, background: p.color }} title={`${p.name}: ${fmtUsdc(p.value)}`} />
          ))}
      </div>
      <ul className="mt-2.5 grid gap-1">
        {parts.map((p) => (
          <li key={p.name} className="t-caption inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px]" style={{ background: p.color }} />
            {p.name}
            <span className="text-ink tnum">{fmtUsdc(p.value)}</span>
            <span className="tnum">({p.pct.toFixed(1)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
