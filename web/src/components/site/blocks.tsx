import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "../motion/Reveal";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}>{children}</div>;
}

/// Sections alternate white and Apple's light grey; headings reveal on scroll.
export function Section({ id, eyebrow, title, lede, children, className, tint, center }: { id?: string; eyebrow?: string; title?: ReactNode; lede?: ReactNode; children?: ReactNode; className?: string; tint?: boolean; center?: boolean }) {
  return (
    <section id={id} className={cn("py-14 sm:py-20", tint && "border-y border-hairline/50 bg-surface/30", className)}>
      <Container>
        <Reveal className={cn(center && "mx-auto max-w-3xl text-center")}>
          {eyebrow && <div className="text-[15px] font-semibold text-accent">{eyebrow}</div>}
          {title && <h2 className={cn("t-display mt-2", !center && "max-w-3xl")}>{title}</h2>}
          {lede && <p className={cn("t-lede mt-4", center ? "mx-auto max-w-2xl" : "max-w-2xl")}>{lede}</p>}
        </Reveal>
        {children && <div className={cn(title || lede ? "mt-10" : "")}>{children}</div>}
      </Container>
    </section>
  );
}

export function PageHeader({ eyebrow, title, lede }: { eyebrow: string; title: ReactNode; lede?: ReactNode }) {
  return (
    <div className="-mt-[70px] pt-[70px]">
      <Container className="pb-14 pt-16 text-center sm:pb-16 sm:pt-20">
        <Reveal y={10}>
          <div className="text-[15px] font-semibold text-accent">{eyebrow}</div>
          <h1 className="t-page mx-auto mt-3 max-w-3xl">{title}</h1>
          {lede && <p className="t-lede mx-auto mt-5 max-w-2xl text-[19px]">{lede}</p>}
        </Reveal>
      </Container>
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
    <div className="card h-full p-6">
      {index && <div className="ios-icon bg-accent text-[14px]">{index.replace(/^0/, "")}</div>}
      <h3 className={cn("text-[17px] font-semibold tracking-[-0.01em] text-ink", index && "mt-4")}>{title}</h3>
      <div className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{children}</div>
    </div>
  );
}

export function CTA({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  const external = href.startsWith("http");
  const cls = cn(
    "pressable inline-flex h-[50px] items-center justify-center gap-1.5 rounded-[14px] px-7 text-[17px] font-semibold",
    variant === "primary" ? "bg-accent text-white hover:brightness-95" : "bg-accent-soft text-accent hover:brightness-[0.97]",
  );
  const icon = external ? <ArrowUpRight size={16} /> : null;
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
    <pre className="frost overflow-x-auto rounded-2xl p-5 font-mono text-[13px] leading-relaxed text-ink-2">
      <code>{children}</code>
    </pre>
  );
}

export const ARC_EXPLORER = "https://explorer.testnet.arc.io";
export const contracts: [string, string, string][] = [
  ["Vault", "0x7A40b36b012DC19b1f42dd68C13F4daE312e2319", "ERC-4626 vault over USDC: quote, sell, buy, settle, markImpaired"],
  ["ClaimWrapper", "0xfc7E6ECF94e88E050c73733aC3cf03f831115952", "deposit, depositAndSell, collect, redeem"],
  ["ClaimToken", "0x39006ed8b5a1f7c7cd7c6C33f522fF8C8e61B090", "ERC-1155 claims, one id per fund and payout date"],
  ["NavOracle", "0xCd55924a73771d508887905473d93B981ac4A08b", "Chainlink Runtime Environment (CRE) receiver: NAV, time, issuer status"],
  ["FundRegistry", "0x634697188F17eC1064f6e9A0aE000a504983dCe4", "Listed funds and pricing terms"],
  ["IssuerStub", "0x2b492aD36D8BB7BA6341a06AF76f1614A9516Ebe", "Stand-in issuer redemption desk"],
  ["ACRED (stand-in)", "0xCd5DE841b0f781A866cA6E978A19d6d5431683E2", "Fund token, 90-day payout"],
  ["ACREDd (demo)", "0x8d9FF934E08DA9f8AEbF2280dAD218e8d176d06F", "Fund token, 15-minute payout"],
];
