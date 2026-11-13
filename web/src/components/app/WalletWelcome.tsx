"use client";

import { GlassBackdrop } from "../art/GlassBackdrop";
import { GLASS_BG } from "../art/glass";
import { ConnectButton } from "../ConnectButton";
import { useWallet } from "@/hooks/useEarlyout";
import { COPY } from "@/lib/copy";

/// Shown above a ticket while no wallet is connected: a short welcome on the
/// Ledger green glass and the connect button.
export function WalletWelcome({ screen }: { screen: "sell" | "vault" | "buy" }) {
  const wallet = useWallet();
  if (wallet.isConnected) return null;
  const c = COPY.app.welcome[screen];
  return (
    <section aria-label={c.title} className={`relative overflow-hidden rounded-[6px] ${GLASS_BG}`}>
      <GlassBackdrop wash="center" />
      <div className="relative px-5 py-6">
        <h2 className="font-serif text-[1.5rem] leading-tight text-ink">{c.title}</h2>
        <p className="mt-1.5 text-[14px] leading-relaxed !text-ink">{c.body}</p>
        <div className="mt-4">
          <ConnectButton />
        </div>
      </div>
    </section>
  );
}
