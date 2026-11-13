"use client";

import { ArrowUpRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "../brand/Logo";
import { REPO, STUDIO } from "./links";
import { ThemeToggle } from "../ThemeToggle";
import { TestnetStrip } from "../TestnetStrip";
import { buttonClass } from "../ui/primitives";
import { COPY } from "@/lib/copy";

const N = COPY.nav;

export const siteLinks = [
  { href: "/holders", label: N.holders },
  { href: "/liquidity", label: N.liquidity },
  { href: "/platforms", label: N.platforms },
  { href: "/docs", label: N.docs },
];

const menuLinks = [
  ...siteLinks,
  { href: "/security", label: N.security },
  { href: "/company", label: N.company },
  { href: "/legal", label: N.testnet },
];

/// Top bar: logo, the four site sections, theme switch and the way into the
/// app. Below lg the sections open as a full-width sheet under the bar.
export function SiteNav() {
  const path = usePathname();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on route change.
  const [lastPath, setLastPath] = useState(path);
  if (path !== lastPath) {
    setLastPath(path);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    sheetRef.current?.querySelector<HTMLElement>("a")?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-canvas/95 backdrop-blur-sm">
      <TestnetStrip />
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="Earlyout home" className="flex shrink-0 items-center">
          <Logo />
        </Link>
        <nav aria-label="Site" className="hidden items-center gap-1 lg:flex">
          {siteLinks.map((l) => {
            const active = path === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`relative px-3 py-2 text-[14px] ${active ? "text-ink" : "text-muted hover:text-ink"}`}
              >
                {l.label}
                {active && (
                  <motion.span
                    layoutId="site-nav-rule"
                    className="absolute inset-x-3 -bottom-[11px] h-px bg-ink"
                    transition={reduce ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.35 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle className="hidden sm:grid" />
          <Link href="/sell" className={buttonClass("primary", "sm")}>
            {N.openApp}
          </Link>
          <button
            ref={toggleRef}
            type="button"
            aria-label={open ? N.closeMenu : N.openMenu}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="pressable grid size-8 place-items-center rounded-[6px] border border-hairline text-ink lg:hidden"
          >
            {open ? <X size={16} aria-hidden /> : <Menu size={16} aria-hidden />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-label="Site menu"
            initial={reduce ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -6, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-full border-b border-hairline bg-canvas lg:hidden"
          >
            <nav aria-label="Site sections" className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
              {menuLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  aria-current={path === l.href ? "page" : undefined}
                  className="flex h-12 items-center border-b border-hairline text-[16px] text-ink last:border-b-0"
                >
                  {l.label}
                </Link>
              ))}
              <div className="flex h-12 items-center justify-between">
                <span className="text-[16px] text-ink">{N.appearance}</span>
                <ThemeToggle />
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

const F = COPY.footer;

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-hairline">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-muted">{COPY.home.hero.kicker}.</p>
        </div>
        <FooterCol title={F.columns.product} links={[["/sell", "Sell"], ["/vault", "Vault"], ["/book", "Open claims"], ["/status", "Oracle and risk"]]} />
        <FooterCol title={F.columns.audiences} links={[["/holders", N.holders], ["/liquidity", N.liquidity], ["/platforms", N.platforms]]} />
        <FooterCol title={F.columns.company} links={[["/company", N.company], ["/security", N.security], ["/docs", N.docs], ["/legal", "Legal"]]} />
        <FooterCol title={F.columns.build} links={[[REPO, "GitHub"], [STUDIO, "Arc Studio"]]} />
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-1 border-t border-hairline px-4 py-5 font-mono text-[11px] text-muted sm:flex-row sm:justify-between sm:px-6">
        <span>{F.legal}</span>
        <span>{F.affiliation}</span>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="t-label">{title}</div>
      <ul className="mt-3 space-y-2">
        {links.map(([href, label]) => (
          <li key={href}>
            {href.startsWith("http") ? (
              <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink">
                {label} <ArrowUpRight size={12} aria-hidden />
              </a>
            ) : (
              <Link href={href} className="text-[13px] text-ink-2 hover:text-ink">
                {label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
