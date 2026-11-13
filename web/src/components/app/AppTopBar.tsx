"use client";

import { Menu, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MarketStrip } from "./MarketStrip";
import { groupFor } from "./nav";
import { SidebarBody } from "./Sidebar";
import { ConnectButton } from "../ConnectButton";
import { TestnetStrip } from "../TestnetStrip";
import { COPY } from "@/lib/copy";

/// Above the content: the testnet strip, then the live market strip and the
/// wallet. Below lg a menu button opens the sidebar as a left sheet.
export function AppTopBar() {
  const path = usePathname();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const [lastPath, setLastPath] = useState(path);
  if (path !== lastPath) {
    setLastPath(path);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    sheetRef.current?.querySelector<HTMLElement>("nav a")?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    toggleRef.current?.focus();
  }

  return (
    <header className="sticky top-0 z-30 bg-canvas/95 backdrop-blur-sm">
      <TestnetStrip />
      <div className="flex h-14 items-center gap-3 border-b border-hairline px-4 sm:px-6">
        <button
          ref={toggleRef}
          type="button"
          aria-label={open ? COPY.nav.closeMenu : COPY.nav.openMenu}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="pressable grid size-8 shrink-0 place-items-center rounded-[6px] border border-hairline text-ink lg:hidden"
        >
          {open ? <X size={16} aria-hidden /> : <Menu size={16} aria-hidden />}
        </button>
        <div className="min-w-0 flex-1">
          <MarketStrip scope={groupFor(path)} />
        </div>
        <div className="shrink-0">
          <ConnectButton />
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label={COPY.nav.closeMenu}
              tabIndex={-1}
              onClick={close}
              className="fixed inset-0 z-40 cursor-default bg-ink/20 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.2 }}
            />
            <motion.div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label="App sections menu"
              className="fixed inset-y-0 left-0 z-50 w-[260px] max-w-[85vw] border-r border-hairline bg-canvas lg:hidden"
              initial={reduce ? false : { x: "-100%" }}
              animate={{ x: 0 }}
              exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { x: "-100%", transition: { duration: 0.2 } }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <SidebarBody onNavigate={() => setOpen(false)} indicatorId="sheet-active" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
