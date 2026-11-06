"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { LogoMark } from "./brand/Logo";
import { ConnectButton } from "./ConnectButton";
import { MODE } from "@/lib/addresses";

export const appTabs = [
  { href: "/sell", label: "Sell" },
  { href: "/book", label: "Book" },
  { href: "/vault", label: "Vault" },
  { href: "/status", label: "Risk" },
];

function Tabs({ id, className, itemClass }: { id: string; className: string; itemClass: string }) {
  const path = usePathname();
  const reduce = useReducedMotion();
  return (
    <nav aria-label="App sections" className={className}>
      {appTabs.map((t) => {
        const active = path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={`pressable relative ${itemClass} ${active ? "text-ink" : "text-muted hover:text-ink"}`}>
            {active && (
              <motion.span
                layoutId={id}
                className="absolute inset-0 rounded-[9px] bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.04)]"
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

/// App header: translucent, with a sliding tab indicator. Tabs move to a bottom bar on phones.
export function Toolbar() {
  return (
    <>
      <header className="material sticky top-0 z-20 border-b border-hairline">
        <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Earlyout home">
            <LogoMark className="size-7" />
            <span className="text-[15px] font-semibold tracking-[-0.01em]">Earlyout</span>
          </Link>
          <Tabs id="app-tab-top" className="absolute left-1/2 hidden -translate-x-1/2 rounded-[11px] bg-sunk p-0.5 sm:flex" itemClass="rounded-[9px] px-4 py-1.5 text-[13px] font-medium" />
          <div className="flex items-center gap-2">
            <span className="badge hidden bg-buy-soft text-buy md:inline-flex">
              <span className="badge-dot" />
              {MODE === "mock" ? "Demo data" : "Arc Testnet"}
            </span>
            <ConnectButton />
          </div>
        </div>
      </header>
      <div className="material fixed inset-x-0 bottom-0 z-20 border-t border-hairline px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:hidden">
        <Tabs id="app-tab-bottom" className="mx-auto grid max-w-md grid-cols-4 rounded-[11px] bg-sunk p-0.5" itemClass="rounded-[9px] py-2 text-center text-[13px] font-medium" />
      </div>
    </>
  );
}
