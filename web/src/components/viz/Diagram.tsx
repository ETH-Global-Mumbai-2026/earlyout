import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type DNode = { id: string; x: number; y: number; w: number; h?: number; title: string; sub?: string; tone: Tone; icon: LucideIcon };
export type DEdge = { pts: [number, number][]; label?: string; at?: [number, number]; dashed?: boolean; tone?: Tone };
type Tone = "blue" | "green" | "orange" | "red" | "purple" | "gray" | "chainlink";

// Palette roles, not hues: action blue, brand navy, the three verdict colours,
// neutral grey, and Chainlink's own blue for Chainlink.
const TONE: Record<Tone, string> = {
  blue: "var(--color-accent)",
  green: "var(--color-buy)",
  orange: "var(--color-refuse)",
  red: "var(--color-halt)",
  purple: "var(--color-brand-2)",
  gray: "var(--color-muted)",
  chainlink: "var(--color-chainlink)",
};

/// A small flow diagram in the iOS idiom: white rounded nodes with an app-style
/// icon, hairline connectors with arrowheads, and labels in capsules. On phones
/// the same story is told as a numbered step list, so nothing gets too small to read.
export function Diagram({ id, width, height, nodes, edges, label, steps }: { id: string; width: number; height: number; nodes: DNode[]; edges: DEdge[]; label: string; steps: { icon: LucideIcon; tone: Tone; title: string; text: ReactNode }[] }) {
  return (
    <figure aria-label={label} className="text-left">
      <svg viewBox={`0 0 ${width} ${height}`} className="hidden h-auto w-full sm:block" role="img" aria-label={label}>
        <defs>
          <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" style={{ fill: "var(--color-faint)" }} />
          </marker>
          {Object.entries(TONE).map(([k, c]) => (
            <marker key={k} id={`${id}-arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" style={{ fill: c }} />
            </marker>
          ))}
        </defs>
        {edges.map((e, i) => (
          <g key={i}>
            <polyline
              points={e.pts.map((p) => p.join(",")).join(" ")}
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeDasharray={e.dashed ? "6 6" : undefined}
              markerEnd={`url(#${id}-arrow${e.tone ? `-${e.tone}` : ""})`}
              style={{ stroke: e.tone ? TONE[e.tone] : "var(--color-line-strong)" }}
            />
            {e.label && e.at && <Chip x={e.at[0]} y={e.at[1]} text={e.label} tone={e.tone} />}
          </g>
        ))}
        {nodes.map((n) => {
          const h = n.h ?? 72;
          const Icon = n.icon;
          return (
            <g key={n.id}>
              <rect x={n.x} y={n.y} width={n.w} height={h} rx={16} style={{ fill: "var(--color-surface)", stroke: "var(--color-hairline)" }} strokeWidth={1} />
              <rect x={n.x + 14} y={n.y + h / 2 - 18} width={36} height={36} rx={10} style={{ fill: TONE[n.tone] }} />
              <Icon x={n.x + 22} y={n.y + h / 2 - 10} width={20} height={20} strokeWidth={2.2} style={{ color: "var(--color-surface)" }} />
              <text x={n.x + 62} y={n.y + (n.sub ? h / 2 - 4 : h / 2 + 5)} style={{ fill: "var(--color-ink)", fontSize: 15, fontWeight: 600 }}>
                {n.title}
              </text>
              {n.sub && (
                <text x={n.x + 62} y={n.y + h / 2 + 15} style={{ fill: "var(--color-muted)", fontSize: 12.5 }}>
                  {n.sub}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <ol className="ios-group sm:hidden [--inset:58px]">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={i} className="ios-row items-start">
              <span className="ios-icon mt-0.5" style={{ background: TONE[s.tone] }}>
                <Icon size={17} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[16px] font-semibold">{s.title}</span>
                <span className="block text-[14px] text-ink-2">{s.text}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

function Chip({ x, y, text, tone }: { x: number; y: number; text: string; tone?: Tone }) {
  const w = text.length * 6.6 + 18;
  return (
    <g>
      <rect x={x - w / 2} y={y - 12} width={w} height={24} rx={12} style={{ fill: "var(--color-canvas)", stroke: "var(--color-hairline)" }} />
      <text x={x} y={y + 4} textAnchor="middle" style={{ fill: tone ? TONE[tone] : "var(--color-ink-2)", fontSize: 12, fontWeight: 600 }}>
        {text}
      </text>
    </g>
  );
}
