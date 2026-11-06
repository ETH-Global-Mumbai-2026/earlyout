"use client";

import Link from "next/link";
import { Logo } from "./brand/Logo";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ConnectButton } from "./ConnectButton";
import { ThemeToggle } from "./theme";

const tabs = [
  { href: "/sell", label: "Sell" },
  { href: "/book", label: "Book" },
  { href: "/vault", label: "Vault" },
  { href: "/status", label: "Status" },
];

function Tabs({ id, className }: { id: string; className: string }) {
  const path = usePathname();
  const reduce = useReducedMotion();
  return (
    <nav aria-label="App sections" className={className}>
      {tabs.map((t) => {
        const active = path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`pressable relative flex-1 rounded-full px-3.5 py-1.5 text-center font-mono text-[13px] ${active ? "text-ink" : "text-muted"}`}
          >
            {active && (
              <motion.span
                layoutId={id}
                className="absolute inset-0 rounded-full border border-hairline bg-surface"
                transition={reduce ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.35 }}
              />
            )}
            <span className="relative">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/// App header. Tabs sit in it on wide screens and in a bottom tab bar on phones.
export function Toolbar() {
  return (
    <>
      <header className="material sticky top-0 z-20 border-b border-hairline">
        <div className="flex h-14 w-full items-center justify-between gap-3 px-4 sm:px-8">
          <Link href="/" className="shrink-0 font-mono text-[15px] tracking-tight">
          <Logo />
          </Link>
          <Tabs id="tab-pill-top" className="hidden rounded-full bg-surface-2 p-1 sm:flex" />
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <ConnectButton />
          </div>
        </div>
      </header>
      <div className="material fixed inset-x-0 bottom-0 z-20 border-t border-hairline px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:hidden">
        <Tabs id="tab-pill-bottom" className="mx-auto flex max-w-md rounded-full bg-surface-2 p-1" />
      </div>
    </>
  );
}
