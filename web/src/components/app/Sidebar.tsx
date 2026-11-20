"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAV } from "./nav";
import { Logo } from "../brand/Logo";
import { ThemeToggle } from "../ThemeToggle";
import { COPY } from "@/lib/copy";
import { MODE } from "@/lib/addresses";
import { TESTNET } from "@/lib/site";
import { openOperatorDialog } from "./DemoGate";

/// The app's left column: sections grouped by audience, network status and
/// the theme switch at the foot. `onNavigate` closes the phone sheet.
export function SidebarBody({ onNavigate, indicatorId = "sidebar-active" }: { onNavigate?: () => void; indicatorId?: string }) {
  const path = usePathname();
  const reduce = useReducedMotion();
  return (
    <div className="flex h-full flex-col">
      <Link href="/" aria-label="Earlyout home" className="flex h-14 items-center px-5" onClick={onNavigate}>
        <Logo />
      </Link>
      <nav aria-label="App sections" className="flex-1 overflow-y-auto px-3 py-4">
        {APP_NAV.map((g) => (
          <div key={g.group} className="mb-5">
            <div className="t-label px-2 pb-1.5">{g.group}</div>
            <ul>
              {g.items.map((i) => {
                const active = path === i.href || path.startsWith(`${i.href}/`);
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex h-9 items-center rounded-[6px] px-2 text-[14px] ${active ? "text-ink" : "text-ink-2 hover:text-ink"}`}
                    >
                      {active && (
                        <motion.span
                          layoutId={indicatorId}
                          className="absolute inset-0 rounded-[6px] bg-surface shadow-[0_0_0_1px_var(--color-hairline)]"
                          transition={reduce ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.3 }}
                        />
                      )}
                      <span className="relative">{i.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="flex items-center justify-between gap-2 border-t border-hairline px-5 py-3">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] text-muted">
          <span className="size-1.5 rounded-full bg-buy" aria-hidden />
          {MODE === "mock" ? COPY.app.network.mock : COPY.app.network.live}
        </span>
        <span className="flex items-center gap-2">
          {TESTNET && (
            <button type="button" onClick={openOperatorDialog} className="font-mono text-[11px] text-muted hover:text-ink">
              {COPY.app.operator}
            </button>
          )}
          <ThemeToggle />
        </span>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[220px] shrink-0 border-r border-hairline bg-canvas lg:block">
      <SidebarBody />
    </aside>
  );
}
