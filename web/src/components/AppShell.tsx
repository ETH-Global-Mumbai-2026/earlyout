"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ConfigNotice } from "./ConfigNotice";
import { ShaderPanel, type ShaderShape } from "./ShaderPanel";
import { Toolbar } from "./Toolbar";
import { useFunds } from "@/hooks/useEarlyout";
import { fmtNav } from "@/lib/format";

const shapeFor: Record<string, ShaderShape> = { "/sell": "warp", "/book": "dots", "/vault": "sphere", "/status": "wave" };

/// The reference layout as an app shell: content on the left, the dithered
/// panel on the right. On phones the panel becomes a band under the header.
export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const funds = useFunds();
  const failed = funds.data?.some((f) => f.status === 1 || f.impaired) ?? false;
  const lead = funds.data?.[0];
  const shape = shapeFor[path] ?? "warp";
  const caption = lead ? (
    <>
      <span>{lead.symbol} NAV {fmtNav(lead.nav)}</span>
      <span className={failed ? "text-halt" : "text-buy"}>{failed ? "ISSUER FAILED" : "ISSUER OK"}</span>
    </>
  ) : null;

  return (
    <>
      <Toolbar />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,42%)]">
        <ShaderPanel shape={shape} tone={failed ? "halt" : "ok"} caption={caption} className="h-32 border-b border-hairline lg:hidden" />
        <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 sm:px-8 sm:pb-24 lg:pt-10">
          <ConfigNotice />
          {children}
        </main>
        <ShaderPanel
          shape={shape}
          tone={failed ? "halt" : "ok"}
          caption={caption}
          className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] border-l border-hairline lg:block"
        />
      </div>
    </>
  );
}
