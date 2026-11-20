"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { arcTestnet } from "@/lib/chain";
import { MODE } from "@/lib/addresses";
import { shortAddr } from "@/lib/format";
import { Button } from "./ui/primitives";
import { useCircle } from "@/hooks/useEarlyout";
import { circleAvailable, signInWithCircle, signOutOfCircle } from "@/lib/circle/wallet";

export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const circle = useCircle();

  if (MODE === "mock") {
    return <span className="num inline-flex h-8 items-center rounded-[6px] border border-line-strong bg-surface px-3 text-xs text-muted">0x0000…d3b0</span>;
  }
  if (circle.status === "ready") {
    return (
      <Button size="sm" variant="secondary" onClick={() => signOutOfCircle()} title="Sign out of your Circle wallet">
        <span className="size-1.5 rounded-full bg-buy" />
        <span className="num">{shortAddr(circle.address)}</span>
        <span className="t-label !text-[10px]">Circle</span>
      </Button>
    );
  }
  if (!isConnected || !address) {
    // Wallets that announce themselves (EIP-6963) appear by name; the generic
    // "injected" entry is whichever extension grabbed window.ethereum, so it is
    // only offered when nothing announced itself.
    const named = connectors.filter((c) => c.id !== "injected");
    const choices = named.length > 0 ? named : connectors;
    if (choices.length <= 1 && !circleAvailable) {
      const only = choices[0];
      return (
        <Button size="sm" onClick={() => only && connect({ connector: only })} loading={isPending} disabled={!only}>
          Connect wallet
        </Button>
      );
    }
    return (
      <div className="relative">
        <Button size="sm" onClick={() => setOpen((o) => !o)} loading={isPending || circle.status === "signing-in"} aria-haspopup="menu" aria-expanded={open}>
          Connect wallet
        </Button>
        {open && (
          <>
            <button type="button" aria-label="Close wallet list" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
            <div role="menu" aria-label="Choose a wallet" className="absolute right-0 top-[calc(100%+6px)] z-50 w-64 overflow-hidden rounded-[6px] border border-hairline bg-surface shadow-[var(--shadow-float)]">
              <div className="t-label px-3 pb-1 pt-3">Choose a wallet</div>
              {choices.map((c) => (
                <button
                  key={c.uid}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    connect({ connector: c });
                  }}
                  className="flex h-11 w-full items-center gap-3 px-3 text-left hover:bg-sunk"
                >
                  {c.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.icon} alt="" className="size-6 rounded-[4px]" />
                  ) : (
                    <span className="grid size-6 place-items-center rounded-[4px] bg-sunk font-mono text-[11px]">{c.name.slice(0, 1)}</span>
                  )}
                  <span className="flex-1 text-[14px]">{c.name}</span>
                </button>
              ))}
              {circleAvailable && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    void signInWithCircle().catch(() => undefined);
                  }}
                  className="flex h-auto w-full items-center gap-3 border-t border-hairline px-3 py-2.5 text-left hover:bg-sunk"
                >
                  <span className="grid size-6 place-items-center rounded-[4px] bg-sunk font-mono text-[11px]">C</span>
                  <span className="flex-1">
                    <span className="block text-[14px]">Circle wallet</span>
                    <span className="block text-[12px] text-muted">No extension. Set a PIN, gas is covered.</span>
                  </span>
                </button>
              )}
              {circle.status === "error" && <p className="px-3 pb-2 text-[12px] text-halt">{circle.error}</p>}
            </div>
          </>
        )}
      </div>
    );
  }
  if (chainId !== arcTestnet.id) {
    return (
      <Button size="sm" variant="secondary" onClick={() => switchChain({ chainId: arcTestnet.id })} loading={switching}>
        Switch to Arc
      </Button>
    );
  }
  return (
    <Button size="sm" variant="secondary" onClick={() => disconnect()} title="Disconnect">
      <span className="size-1.5 rounded-full bg-buy" />
      <span className="num">{shortAddr(address)}</span>
    </Button>
  );
}
