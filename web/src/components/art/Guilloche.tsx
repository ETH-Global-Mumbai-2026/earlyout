import { useId } from "react";
import { cn } from "@/lib/utils";

const TAU = Math.PI * 2;

/// One closed rosette around the origin: a circle of radius R modulated by two
/// summed sines. Rotated copies of it weave the engraved banknote look.
function rosette(R: number, a: number, k: number, b: number, k2: number, samples: number) {
  let d = "";
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * TAU;
    const r = R + a * Math.sin(k * t) + b * Math.sin(k2 * t);
    d += `${i ? "L" : "M"}${(r * Math.cos(t)).toFixed(1)} ${(r * Math.sin(t)).toFixed(1)}`;
  }
  return `${d}Z`;
}

/// One rope strand: two summed sines across the full width, periodic every 120.
function strand() {
  let d = "";
  for (let x = -120; x <= 1320; x += 4) {
    const y = 9 * Math.sin((TAU * x) / 120) + 3 * Math.sin((TAU * x) / 40);
    d += `${x === -120 ? "M" : "L"}${x} ${y.toFixed(1)}`;
  }
  return d;
}

// Computed once at module load: pure maths, no randomness, so the server and
// the client render the same markup.
const OUTER = rosette(232, 28, 14, 7, 42, 720);
const INNER = rosette(132, 20, 9, 5, 27, 540);
const CORE = rosette(54, 9, 7, 0, 0, 240);
const STRAND = strand();
const OUTER_TURNS = Array.from({ length: 16 }, (_, i) => +((i * 360) / 14 / 16).toFixed(3));
const INNER_TURNS = Array.from({ length: 12 }, (_, i) => +((i * 360) / 9 / 12).toFixed(3));
const CORE_TURNS = Array.from({ length: 8 }, (_, i) => +((i * 360) / 7 / 8).toFixed(3));
const STRAND_SHIFTS = Array.from({ length: 8 }, (_, i) => i * 15);

/// A faint banknote-style engraved pattern: a woven rosette and two rope bands,
/// drawn as inline SVG in currentColor. It fills its positioned parent and is
/// decoration only.
export function Guilloche({ className, rosette = true }: { className?: string; rosette?: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const outer = `${id}-o`;
  const inner = `${id}-i`;
  const core = `${id}-c`;
  const rope = `${id}-r`;
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 1200 600"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="currentColor"
      strokeWidth={0.6}
      className={cn("pointer-events-none absolute inset-0 h-full w-full select-none text-ink opacity-[0.07] dark:opacity-[0.05]", className)}
    >
      <defs>
        <path id={outer} d={OUTER} vectorEffect="non-scaling-stroke" />
        <path id={inner} d={INNER} vectorEffect="non-scaling-stroke" />
        <path id={core} d={CORE} vectorEffect="non-scaling-stroke" />
        <path id={rope} d={STRAND} vectorEffect="non-scaling-stroke" />
      </defs>
      {rosette && (
      <g transform="translate(880 300)">
        {OUTER_TURNS.map((a) => (
          <use key={`o${a}`} href={`#${outer}`} transform={`rotate(${a})`} />
        ))}
        {INNER_TURNS.map((a) => (
          <use key={`i${a}`} href={`#${inner}`} transform={`rotate(${a})`} />
        ))}
        {CORE_TURNS.map((a) => (
          <use key={`c${a}`} href={`#${core}`} transform={`rotate(${a})`} />
        ))}
      </g>
      )}
      {[56, 544].map((y) =>
        STRAND_SHIFTS.map((dx) => <use key={`${y}-${dx}`} href={`#${rope}`} transform={`translate(${dx} ${y})`} />),
      )}
    </svg>
  );
}

/// The woven rosette on its own, in a square box, so it can sit centred
/// behind one element (the hero quote).
export function Rosette({ className }: { className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const outer = `${id}-o`;
  const inner = `${id}-i`;
  const core = `${id}-c`;
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="-270 -270 540 540"
      fill="none"
      stroke="currentColor"
      strokeWidth={0.6}
      className={cn("pointer-events-none select-none text-ink opacity-[0.09] dark:opacity-[0.06]", className)}
    >
      <defs>
        <path id={outer} d={OUTER} vectorEffect="non-scaling-stroke" />
        <path id={inner} d={INNER} vectorEffect="non-scaling-stroke" />
        <path id={core} d={CORE} vectorEffect="non-scaling-stroke" />
      </defs>
      {OUTER_TURNS.map((a) => (
        <use key={`o${a}`} href={`#${outer}`} transform={`rotate(${a})`} />
      ))}
      {INNER_TURNS.map((a) => (
        <use key={`i${a}`} href={`#${inner}`} transform={`rotate(${a})`} />
      ))}
      {CORE_TURNS.map((a) => (
        <use key={`c${a}`} href={`#${core}`} transform={`rotate(${a})`} />
      ))}
    </svg>
  );
}
