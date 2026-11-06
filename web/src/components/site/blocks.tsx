import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}>{children}</div>;
}

export function Section({ id, eyebrow, title, lede, children, className }: { id?: string; eyebrow?: string; title?: ReactNode; lede?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <section id={id} className={cn("border-t border-hairline py-16 sm:py-24", className)}>
      <Container>
        {eyebrow && <div className="t-eyebrow">{eyebrow}</div>}
        {title && <h2 className="t-display mt-3 max-w-3xl">{title}</h2>}
        {lede && <p className="t-lede mt-4 max-w-2xl">{lede}</p>}
        {children && <div className={cn(title || lede ? "mt-10" : "")}>{children}</div>}
      </Container>
    </section>
  );
}

export function PageHeader({ eyebrow, title, lede }: { eyebrow: string; title: ReactNode; lede?: ReactNode }) {
  return (
    <Container className="pb-12 pt-14 sm:pb-16 sm:pt-20">
      <div className="t-eyebrow">{eyebrow}</div>
      <h1 className="t-hero mt-4 max-w-4xl">{title}</h1>
      {lede && <p className="t-lede mt-6 max-w-2xl">{lede}</p>}
    </Container>
  );
}

/// Mono label/value rows, the reference layout's signature.
export function DataRows({ rows, className }: { rows: [ReactNode, ReactNode, ReactNode?][]; className?: string }) {
  return (
    <div className={cn("hairline-rows", className)}>
      {rows.map(([a, b, c], i) => (
        <div key={i} className="data-row">
          <span className="text-muted">{a}</span>
          <span>{b}</span>
          <span className="text-right text-muted">{c}</span>
        </div>
      ))}
    </div>
  );
}

export function Grid({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  const c = { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-2 lg:grid-cols-4" }[cols];
  return <div className={cn("grid gap-px overflow-hidden rounded-[16px] border border-hairline bg-hairline", c)}>{children}</div>;
}

export function Tile({ index, title, children }: { index?: string; title: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-canvas p-6 sm:p-8">
      {index && <div className="text-xs font-semibold tracking-wide text-accent">{index}</div>}
      <h3 className="t-headline mt-3">{title}</h3>
      <div className="t-body mt-2 text-muted">{children}</div>
    </div>
  );
}

export function CTA({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  const external = href.startsWith("http");
  const cls = cn(
    "pressable inline-flex h-11 items-center gap-2 rounded-full px-5 text-[15px] font-medium",
    variant === "primary" ? "bg-ink text-canvas" : "border border-hairline text-ink",
  );
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {children} <ArrowUpRight size={15} />
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-[12px] border border-hairline bg-surface p-4 font-mono text-[13px] leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

export const ARC_EXPLORER = "https://explorer.testnet.arc.io";
export const contracts: [string, string, string][] = [
  ["Vault", "0x7A40b36b012DC19b1f42dd68C13F4daE312e2319", "ERC-4626 over USDC: quote, sell, buy, settle, markImpaired"],
  ["ClaimWrapper", "0xfc7E6ECF94e88E050c73733aC3cf03f831115952", "deposit, depositAndSell, collect, redeem"],
  ["ClaimToken", "0x39006ed8b5a1f7c7cd7c6C33f522fF8C8e61B090", "ERC-1155 claims, one id per fund and payout date"],
  ["NavOracle", "0xCd55924a73771d508887905473d93B981ac4A08b", "Chainlink CRE receiver: NAV, time, issuer status"],
  ["FundRegistry", "0x634697188F17eC1064f6e9A0aE000a504983dCe4", "Listed funds and pricing terms"],
  ["IssuerStub", "0x2b492aD36D8BB7BA6341a06AF76f1614A9516Ebe", "Stand-in issuer redemption desk"],
  ["ACRED (stand-in)", "0xCd5DE841b0f781A866cA6E978A19d6d5431683E2", "Fund token, 90-day payout"],
  ["ACREDd (demo)", "0x8d9FF934E08DA9f8AEbF2280dAD218e8d176d06F", "Fund token, 15-minute payout"],
];
