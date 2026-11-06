"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ConnectButton } from "./ConnectButton";

const tabs = [
  { href: "/", label: "Sell" },
  { href: "/book", label: "Book" },
  { href: "/vault", label: "Vault" },
  { href: "/status", label: "Status" },
];

function Tabs({ id, className }: { id: string; className: string }) {
  const path = usePathname();
  const reduce = useReducedMotion();
  return (
    <nav aria-label="Sections" className={className}>
      {tabs.map((t) => {
        const active = path === t.href || (t.href !== "/" && path.startsWith(t.href));
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`pressable relative flex-1 rounded-full px-3.5 py-1.5 text-center text-sm font-medium ${active ? "text-ink" : "text-muted"}`}
          >
            {active && (
              <motion.span
                layoutId={id}
                className="absolute inset-0 rounded-full bg-surface shadow-sm"
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

/// Top bar on every size; the section tabs sit in it on wide screens and in a
/// bottom tab bar on phones, where they would not fit beside the wallet button.
export function Toolbar() {
  return (
    <>
      <header className="material sticky top-0 z-20 border-b border-hairline">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="t-headline shrink-0 tracking-tight">
            Earlyout
          </Link>
          <Tabs id="tab-pill-top" className="hidden rounded-full bg-surface-2 p-1 sm:flex" />
          <ConnectButton />
        </div>
      </header>
      <div className="material fixed inset-x-0 bottom-0 z-20 border-t border-hairline px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:hidden">
        <Tabs id="tab-pill-bottom" className="mx-auto flex max-w-md rounded-full bg-surface-2 p-1" />
      </div>
    </>
  );
}
