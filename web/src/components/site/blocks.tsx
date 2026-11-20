import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "../motion/Reveal";
import { GlassBackdrop } from "../art/GlassBackdrop";
import { GLASS_BG } from "../art/glass";
import { buttonClass } from "../ui/buttonClass";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>{children}</div>;
}

type Layout = "split" | "stack" | "bleed";

/// A page section. `split` puts the heading in a left column beside the
/// content; `stack` puts it above; `bleed` lets the content run the full
/// container width under a hairline. `eyebrow` and `center` remain for pages
/// not yet rebuilt.
export function Section({
  id,
  kicker,
  eyebrow,
  title,
  lede,
  layout = "stack",
  children,
  className,
  tint,
  center,
}: {
  id?: string;
  kicker?: string;
  eyebrow?: string;
  title?: ReactNode;
  lede?: ReactNode;
  layout?: Layout;
  children?: ReactNode;
  className?: string;
  tint?: boolean;
  center?: boolean;
}) {
  const k = kicker ?? eyebrow;
  const head = (k || title || lede) && (
    <Reveal className={cn(center && "mx-auto max-w-3xl text-center", layout === "split" && "lg:sticky lg:top-24")}>
      {k && <div className="t-label">{k}</div>}
      {title && <h2 className={cn("t-page mt-3", !center && "max-w-3xl")}>{title}</h2>}
      {lede && <p className={cn("t-lede mt-4 text-ink-2", center ? "mx-auto max-w-2xl" : "max-w-2xl")}>{lede}</p>}
    </Reveal>
  );
  return (
    <section id={id} data-layout={layout} className={cn("py-16 sm:py-24", tint && "border-y border-hairline bg-surface-2", layout === "bleed" && "border-t border-hairline", className)}>
      <Container>
        {layout === "split" ? (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div>{head}</div>
            <div className="min-w-0">{children}</div>
          </div>
        ) : (
          <>
            {head}
            {children && <div className={cn(head ? "mt-10" : "")}>{children}</div>}
          </>
        )}
      </Container>
    </section>
  );
}

export function PageHeader({ eyebrow, title, lede, glass }: { eyebrow: string; title: ReactNode; lede?: ReactNode; glass?: boolean }) {
  const body = (
    <Container className={cn("relative pb-10 pt-14 sm:pb-14 sm:pt-20", glass && "py-20 sm:py-28")}>
      <Reveal y={10}>
        <div className={cn("t-label", glass && "!text-ink-2")}>{eyebrow}</div>
        <h1 className="t-hero mt-4 max-w-4xl">{title}</h1>
        {lede && <p className={cn("t-lede mt-6 max-w-2xl text-ink-2", glass && "!text-ink")}>{lede}</p>}
      </Reveal>
    </Container>
  );
  if (!glass) return body;
  return (
    <div className={cn("relative overflow-hidden", GLASS_BG)}>
      <GlassBackdrop />
      {body}
    </div>
  );
}

/// Label / value / note rows.
export function DataRows({ rows, className }: { rows: [ReactNode, ReactNode, ReactNode?][]; className?: string }) {
  return (
    <div className={cn("hairline-rows", className)}>
      {rows.map(([a, b, c], i) => (
        <div key={i} className="data-row">
          <span className="text-muted">{a}</span>
          <span className="font-medium">{b}</span>
          <span className="text-right text-muted">{c}</span>
        </div>
      ))}
    </div>
  );
}

/// Cells in one bordered block, the way institutional sites lay out feature grids.
export function Grid({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  const c = { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[cols];
  const items = Array.isArray(children) ? children : [children];
  return (
    <div className={cn("grid gap-4", c)}>
      {items.map((child, i) => (
        <Reveal key={i} delay={i * 0.06} className="h-full">
          {child}
        </Reveal>
      ))}
    </div>
  );
}

export function Tile({ index, title, children }: { index?: string; title: ReactNode; children: ReactNode }) {
  return (
    <div className="h-full border-t border-ink pt-4">
      {index && <div className="t-label">{index}</div>}
      <h3 className={cn("text-[17px] font-medium tracking-[-0.01em] text-ink", index && "mt-2")}>{title}</h3>
      <div className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{children}</div>
    </div>
  );
}

export function CTA({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  const external = href.startsWith("http");
  const cls = buttonClass(variant, "lg");
  const icon = external ? <ArrowUpRight size={16} /> : null;
  if (!external && !href.startsWith("/"))
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {children} {icon}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children} {icon}
    </Link>
  );
}

export function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-[4px] border border-hairline bg-sunk p-5 font-mono text-[13px] leading-relaxed text-ink-2">
      <code>{children}</code>
    </pre>
  );
}

export const ARC_EXPLORER = "https://explorer.testnet.arc.io";
export const contracts: [string, string, string][] = [
  ["Vault", "0x19F0c2bEec4E3520F4C49c8B28CAa9eEb7972997", "ERC-4626 vault over USDC: quote, sell, buy, settle, markImpaired"],
  ["ClaimWrapper", "0xfc7E6ECF94e88E050c73733aC3cf03f831115952", "deposit, depositAndSell, collect, redeem"],
  ["ClaimToken", "0x39006ed8b5a1f7c7cd7c6C33f522fF8C8e61B090", "ERC-1155 claims, one id per fund and payout date"],
  ["NavOracle", "0xCd55924a73771d508887905473d93B981ac4A08b", "Chainlink Runtime Environment (CRE) receiver: NAV, time, issuer status"],
  ["FundRegistry", "0x634697188F17eC1064f6e9A0aE000a504983dCe4", "Listed funds and pricing terms"],
  ["IssuerStub", "0x2b492aD36D8BB7BA6341a06AF76f1614A9516Ebe", "Stand-in issuer redemption desk"],
  ["ACRED (stand-in)", "0xCd5DE841b0f781A866cA6E978A19d6d5431683E2", "Fund token, 90-day payout"],
  ["ACREDd (demo)", "0x8d9FF934E08DA9f8AEbF2280dAD218e8d176d06F", "Fund token, 15-minute payout"],
];
