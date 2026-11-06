"use client";

import type { ReactNode } from "react";
import { ConfigNotice } from "./ConfigNotice";
import { RiskStrip } from "./RiskStrip";
import { Toolbar } from "./Toolbar";

/// The app frame: translucent header, a strip of live figures, a roomy workspace.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="theme-app">
      <Toolbar />
      <RiskStrip />
      <main className="mx-auto w-full max-w-[1320px] px-4 pb-28 pt-8 sm:px-6 sm:pb-14">
        <ConfigNotice />
        {children}
      </main>
    </div>
  );
}
