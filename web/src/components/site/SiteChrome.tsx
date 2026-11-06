"use client";

import { ArrowUpRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "../brand/Logo";
import { REPO, STUDIO } from "./links";

export const siteLinks = [
  { href: "/how-it-works", label: "Product" },
  { href: "/distributors", label: "For distributors" },
  { href: "/developers", label: "Developers" },
  { href: "/security", label: "Security" },
  { href: "/about", label: "Company" },
];

export function SiteNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="material sticky top-0 z-30 border-b border-hairline">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
        <div className="flex items-center gap-10">
          <Link href="/" onClick={() => setOpen(false)} aria-label="Earlyout home">
            <Logo />
          </Link>
          <nav aria-label="Site" className="hidden items-center gap-7 lg:flex">
            {siteLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={path === l.href ? "page" : undefined}
                className={`text-[13px] ${path === l.href ? "font-medium text-ink" : "text-ink-2 hover:text-ink"}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2.5">
          <a href={`${REPO}/issues/new`} target="_blank" rel="noreferrer" className="pressable hidden h-8 items-center rounded-full px-3.5 text-[13px] font-medium text-ink-2 hover:bg-sunk sm:inline-flex">
            Contact
          </a>
          <Link href="/sell" className="pressable inline-flex h-8 items-center rounded-full bg-accent px-4 text-[13px] font-medium text-white hover:bg-[#0077ed]">
            Launch app
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="pressable grid size-8 place-items-center rounded-full hover:bg-sunk lg:hidden"
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Site" className="border-t border-hairline lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col px-5 py-2 sm:px-8">
            {[...siteLinks, { href: "/legal", label: "Testnet notice" }].map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="border-b border-hairline py-3 text-[15px] font-medium last:border-0">
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-canvas">
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
