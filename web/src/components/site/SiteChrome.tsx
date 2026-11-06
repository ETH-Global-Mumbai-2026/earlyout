"use client";

import { ArrowUpRight, ChevronRight, Menu, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "../brand/Logo";
import { REPO, STUDIO } from "./links";
import { ThemeToggle } from "../ThemeToggle";
import { useFunds } from "@/hooks/useEarlyout";
import { fmtNav } from "@/lib/format";

export const siteLinks = [
  { href: "/how-it-works", label: "Product" },
  { href: "/distributors", label: "For distributors" },
  { href: "/developers", label: "Developers" },
  { href: "/security", label: "Security" },
  { href: "/about", label: "Company" },
];

function LiveNav() {
  const funds = useFunds();
  const acred = funds.data?.find((f) => f.symbol === "ACRED");
  if (!acred) return null;
  return (
    <Link href="/status" className="pressable hidden items-center gap-2 whitespace-nowrap rounded-full bg-sunk/70 px-3 py-1.5 text-[12px] 2xl:inline-flex" title="ACRED net asset value from Chainlink, live on Arc">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-dot-buy opacity-40 motion-reduce:hidden" />
        <span className="relative inline-flex size-2 rounded-full bg-dot-buy" />
      </span>
      <span className="text-muted">ACRED NAV</span>
      <span className="num font-semibold text-ink">{fmtNav(acred.nav).replace("$", "")}</span>
    </Link>
  );
}

/// Floating liquid-glass capsule: logo, sections with a sliding highlight, the
/// live ACRED price, the theme switch and the way into the app. On phones the
/// sections open as a grouped sheet under the capsule.
export function SiteNav() {
  const path = usePathname();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5">
      <div className="glass mx-auto grid h-[58px] max-w-6xl grid-cols-[1fr_auto] items-center gap-4 rounded-full pl-5 pr-2 lg:grid-cols-[1fr_auto_1fr]">
        <Link href="/" onClick={() => setOpen(false)} aria-label="Earlyout home" className="flex shrink-0 items-center justify-self-start">
          <Logo />
        </Link>
        <nav aria-label="Site" className="hidden items-center gap-0.5 lg:flex">
          {siteLinks.map((l) => {
            const active = path === l.href;
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={`pressable relative rounded-full px-3.5 py-2 text-[14px] font-medium ${active ? "text-ink" : "text-ink-2 hover:text-ink"}`}>
                {active && <motion.span layoutId="site-nav-pill" className="absolute inset-0 rounded-full bg-sunk" transition={reduce ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.4 }} />}
                <span className="relative">{l.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1.5 justify-self-end">
          <LiveNav />
          <ThemeToggle className="hidden sm:grid" />
          <Link href="/sell" className="pressable inline-flex h-[42px] items-center whitespace-nowrap rounded-full bg-accent px-5 text-[15px] font-semibold text-white hover:brightness-95">
            Launch app
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="pressable grid size-[42px] place-items-center rounded-full text-ink hover:bg-sunk lg:hidden"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Site" className="glass mx-auto mt-2 max-w-6xl overflow-hidden rounded-[22px] lg:hidden">
          {[...siteLinks, { href: "/legal", label: "Testnet notice" }].map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="ios-row text-[17px] [--inset:20px]">
              <span className="flex-1 pl-1">{l.label}</span>
              <ChevronRight size={18} className="text-faint" aria-hidden />
            </Link>
          ))}
          <div className="ios-row [--inset:20px]">
            <span className="flex-1 pl-1 text-[17px]">Appearance</span>
            <ThemeToggle />
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="material mt-8 border-t border-hairline">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="t-caption mt-3 max-w-xs">Liquidity for tokenized funds that redeem on a schedule. Built at ETHGlobal Mumbai 2026. Testnet only.</p>
        </div>
        <FooterCol title="Product" links={[["/sell", "Sell a claim"], ["/book", "Order book"], ["/vault", "Vault"], ["/status", "Oracle and risk"]]} />
        <FooterCol title="Company" links={[["/how-it-works", "How it works"], ["/distributors", "For distributors"], ["/about", "About"], ["/legal", "Testnet notice"]]} />
        <FooterCol title="Build" links={[["/developers", "Developers"], ["/security", "Security"], [REPO, "GitHub"], [STUDIO, "Arc Studio project"]]} />
      </div>
      <div className="mx-auto max-w-6xl border-t border-hairline px-5 py-5 text-xs text-muted sm:px-8">
        Not investment advice. Contracts run on Arc testnet and hold test USDC only.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="text-[13px] font-semibold text-ink">{title}</div>
      <ul className="mt-3 space-y-2">
        {links.map(([href, label]) => (
          <li key={href}>
            {href.startsWith("http") ? (
              <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
                {label} <ArrowUpRight size={12} />
              </a>
            ) : (
              <Link href={href} className="text-[13px] text-muted hover:text-ink">
                {label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
