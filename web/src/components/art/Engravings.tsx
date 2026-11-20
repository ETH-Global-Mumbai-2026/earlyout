import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/// Certificate-style line marks for the three audiences. Each sits inside the
/// same engraved double ring, drawn in currentColor with 1.25px strokes.

function Seal({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 64 64"
      width={64}
      height={64}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
    >
      <circle cx={32} cy={32} r={30.5} />
      <circle cx={32} cy={32} r={27.5} strokeDasharray="0.01 2.6" />
      {children}
    </svg>
  );
}

/// Holders: an open ledger with ruled entries and a figures column.
export function HoldersMark({ className }: { className?: string }) {
  return (
    <Seal className={className}>
      <path d="M14 22c6-2.2 12-2.2 18 0v21c-6-2.2-12-2.2-18 0Z" />
      <path d="M32 22c6-2.2 12-2.2 18 0v21c-6-2.2-12-2.2-18 0Z" />
      <path d="M17.5 27.5h11M17.5 31.5h11M17.5 35.5h11M17.5 39.5h7" />
      <path d="M35.5 27.5h11M35.5 31.5h11M35.5 35.5h11" />
      <path d="M42.5 25.5v13.5" />
    </Seal>
  );
}

// Spoke ends for the vault wheel: three diameters at 90, 210 and 330 degrees.
const SPOKES = [90, 210, 330].map((deg) => {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const f = (v: number) => v.toFixed(2);
  return `M${f(32 + 3 * c)} ${f(32 - 3 * s)}L${f(32 + 9 * c)} ${f(32 - 9 * s)}M${f(32 - 3 * c)} ${f(32 + 3 * s)}L${f(32 - 9 * c)} ${f(32 + 9 * s)}`;
}).join("");

/// Liquidity: a vault door with its locking wheel, hinges and bolts.
export function LiquidityMark({ className }: { className?: string }) {
  return (
    <Seal className={className}>
      <rect x={15} y={15} width={34} height={34} rx={3} />
      <circle cx={32} cy={32} r={12} />
      <circle cx={32} cy={32} r={3} />
      <path d={SPOKES} />
      <path d="M13 21v5M13 38v5" />
      <circle cx={18.5} cy={18.5} r={0.6} />
      <circle cx={45.5} cy={18.5} r={0.6} />
      <circle cx={18.5} cy={45.5} r={0.6} />
      <circle cx={45.5} cy={45.5} r={0.6} />
    </Seal>
  );
}

// A hub and six peers on a ring, links trimmed so they meet each node's edge.
const PEERS = Array.from({ length: 6 }, (_, i) => {
  const a = (i * Math.PI) / 3;
  return [32 + 14 * Math.cos(a), 32 + 14 * Math.sin(a)] as const;
});
function trimmed(a: readonly [number, number], b: readonly [number, number], ra: number, rb: number) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const f = (v: number) => v.toFixed(2);
  return `M${f(a[0] + (dx * ra) / len)} ${f(a[1] + (dy * ra) / len)}L${f(b[0] - (dx * rb) / len)} ${f(b[1] - (dy * rb) / len)}`;
}
const LINKS =
  PEERS.map((p) => trimmed([32, 32], p, 4, 2.6)).join("") + PEERS.map((p, i) => trimmed(p, PEERS[(i + 1) % 6], 2.6, 2.6)).join("");

/// Platforms: a network, one hub linked to six peers on a ring.
export function PlatformsMark({ className }: { className?: string }) {
  return (
    <Seal className={className}>
      <path d={LINKS} />
      <circle cx={32} cy={32} r={4} />
      {PEERS.map(([x, y], i) => (
        <circle key={i} cx={+x.toFixed(2)} cy={+y.toFixed(2)} r={2.6} />
      ))}
    </Seal>
  );
}
