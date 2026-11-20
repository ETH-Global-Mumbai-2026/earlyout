"use client";

import type { ReactNode } from "react";
import { AppTopBar } from "./app/AppTopBar";
import { Sidebar } from "./app/Sidebar";
import { ConfigNotice } from "./ConfigNotice";
import { OperatorDialog } from "./app/DemoGate";

/// The app frame: a sidebar grouped by audience, a top bar with the live
/// market strip and the wallet, then the screen.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="theme-app flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopBar />
        <main className="mx-auto w-full max-w-[1240px] px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
          <ConfigNotice />
          {children}
        </main>
      </div>
      <OperatorDialog />
    </div>
  );
}
