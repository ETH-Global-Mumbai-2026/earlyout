"use client";

import { ArrowUpRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { Logo } from "../brand/Logo";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { ThemeToggle } from "../theme";
import { REPO, STUDIO } from "./links";

export const siteLinks = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/distributors", label: "Distributors" },
  { href: "/developers", label: "Developers" },
  { href: "/security", label: "Security" },
  { href: "/about", label: "About" },
];


export function SiteNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  return (
    <header className="material sticky top-0 z-30 border-b border-hairline">
      <div className="flex h-14 w-full items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <Link href="/" className="text-[15px] tracking-tight" onClick={() => setOpen(false)}>
          <Logo />
        </Link>
        <nav aria-label="Site" className="hidden items-center gap-6 md:flex">
          {siteLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={path === l.href ? "page" : undefined}
              className={`link-underline text-[14px] ${path === l.href ? "text-ink" : "text-muted"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link href="/sell" className="pressable hidden rounded-full bg-ink px-4 py-1.5 text-[14px] font-medium text-canvas sm:inline-block">
            Open app
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="pressable grid size-9 place-items-center rounded-full md:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.nav
            aria-label="Site"
            className="overflow-hidden border-t border-hairline md:hidden"
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(-6px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(-6px)" }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="flex flex-col px-5 py-2">
              {[...siteLinks, { href: "/sell", label: "Open app" }].map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-3 text-[17px]">
                  {l.label}
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="t-caption mt-3 max-w-xs">
            Early exit for funds that redeem on a schedule. Built at ETHGlobal Mumbai 2026. Testnet only.
          </p>
        </div>
        <FooterCol title="Product" links={[["/sell", "Sell"], ["/book", "Book"], ["/vault", "Vault"], ["/status", "Status"]]} />
        <FooterCol
          title="Company"
          links={[["/how-it-works", "How it works"], ["/distributors", "Distributors"], ["/about", "About"], ["/legal", "Testnet notice"]]}
        />
        <FooterCol
          title="Build"
          links={[["/developers", "Developers"], ["/security", "Security"], [REPO, "GitHub"], [STUDIO, "Arc Studio project"]]}
        />
      </div>
      <div className="mx-auto max-w-6xl px-5 pb-10 text-xs text-faint sm:px-8">
        Not investment advice. Contracts run on Arc testnet and hold test USDC only.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="t-eyebrow">{title}</div>
      <ul className="mt-3 space-y-2">
        {links.map(([href, label]) => (
          <li key={href}>
            {href.startsWith("http") ? (
              <a href={href} target="_blank" rel="noreferrer" className="link-underline inline-flex items-center gap-1 text-sm">
                {label} <ArrowUpRight size={13} className="text-faint" />
              </a>
            ) : (
              <Link href={href} className="link-underline text-sm">
                {label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
