import Link from "next/link";
import type { ReactNode } from "react";

type Art = "sales" | "positions" | "buy" | "claims";

// Small line sketches, 48px, in currentColor.
const ART: Record<Art, ReactNode> = {
  // A receipt with a torn edge: no sales yet.
  sales: (
    <>
      <path d="M14 8h20v32l-3.33-2-3.33 2-3.34-2-3.33 2-3.34-2L14 40Z" />
      <path d="M18 16h12M18 21h12M18 26h7" />
    </>
  ),
  // A stack of coins: no positions yet.
  positions: (
    <>
      <ellipse cx={24} cy={17} rx={10} ry={3.5} />
      <path d="M14 17v6c0 1.93 4.48 3.5 10 3.5s10-1.57 10-3.5v-6" />
      <path d="M14 23v6c0 1.93 4.48 3.5 10 3.5s10-1.57 10-3.5v-6" />
      <path d="M14 29v6c0 1.93 4.48 3.5 10 3.5s10-1.57 10-3.5v-6" />
    </>
  ),
  // A blank price tag: nothing to buy.
  buy: (
    <>
      <path d="M9 25 23 11h14v14L23 39Z" />
      <circle cx={31} cy={17} r={2} />
      <path d="M18 27l6-6" strokeDasharray="0.01 3" />
    </>
  ),
  // A document waiting on a clock: no claims yet.
  claims: (
    <>
      <path d="M25 38H13V8h13l6 6v7" />
      <path d="M26 8v6h6" />
      <path d="M17 18h9M17 23h6" />
      <circle cx={34} cy={33} r={8} />
      <path d="M34 29v4l2.5 2" />
    </>
  ),
};

/// A quiet empty table: a small line sketch, the title, and an optional text link.
export function EmptyState({ art, title, action }: { art: Art; title: string; action?: { href: string; label: string } }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <svg
        aria-hidden
        focusable="false"
        viewBox="0 0 48 48"
        width={48}
        height={48}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-faint"
      >
        {ART[art]}
      </svg>
      <p className="text-[14px] text-muted">{title}</p>
      {action && (
        <Link href={action.href} className="link-underline text-[13px] font-medium text-brand">
          {action.label}
        </Link>
      )}
    </div>
  );
}
