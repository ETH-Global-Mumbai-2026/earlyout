"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { LogoMark } from "./brand/Logo";
import { ConnectButton } from "./ConnectButton";
import { ThemeToggle } from "./ThemeToggle";
import { MODE } from "@/lib/addresses";
import { BookOpen, CircleDollarSign, Landmark, ShieldCheck } from "lucide-react";

export const appTabs = [
  { href: "/sell", label: "Sell", icon: CircleDollarSign },
  { href: "/book", label: "Book", icon: BookOpen },
  { href: "/vault", label: "Vault", icon: Landmark },
  { href: "/status", label: "Risk", icon: ShieldCheck },
];

/// iOS tab bar for phones: icon over label, the selected tab in system blue.
function TabBar() {
  const path = usePathname();
  return (
    <nav aria-label="App sections" className="mx-auto grid max-w-md grid-cols-4">
      {appTabs.map((t) => {
        const active = path.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={`pressable flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium ${active ? "text-accent" : "text-muted"}`}>
            <Icon size={24} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Tabs({ id, className, itemClass }: { id: string; className: string; itemClass: string }) {
  const path = usePathname();
  const reduce = useReducedMotion();
  return (
    <nav aria-label="App sections" className={className}>
      {appTabs.map((t) => {
        const active = path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={`pressable relative ${itemClass} ${active ? "text-ink" : "text-ink-2 hover:text-ink"}`}>
            {active && (
              <motion.span
                layoutId={id}
                className="absolute inset-0 rounded-[7px] bg-surface shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)] dark:bg-[oklch(0.44_0.01_264)]"
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
            <span className="text-[17px] font-semibold tracking-[-0.01em]">Earlyout</span>
          </Link>
          <Tabs id="app-tab-top" className="absolute left-1/2 hidden -translate-x-1/2 rounded-[9px] bg-sunk p-[2px] sm:flex" itemClass="rounded-[7px] px-5 py-1.5 text-[14px] font-medium" />
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 text-[13px] font-medium text-buy md:inline-flex">
              <span className="size-[7px] rounded-full bg-dot-buy" />
              {MODE === "mock" ? "Demo data" : "Arc Testnet"}
            </span>
            <ThemeToggle />
            <ConnectButton />
          </div>
        </div>
      </header>
      <div className="material fixed inset-x-0 bottom-0 z-20 border-t border-hairline px-3 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1.5 sm:hidden">
        <TabBar />
      </div>
    </>
  );
}
