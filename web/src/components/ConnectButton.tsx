"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { arcTestnet } from "@/lib/chain";
import { MODE } from "@/lib/addresses";
import { shortAddr } from "@/lib/format";
import { Button } from "./ui/primitives";

export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [open, setOpen] = useState(false);

  if (MODE === "mock") {
    return <span className="num rounded-xl border border-line-strong bg-surface px-3 py-1.5 text-xs text-muted">0x0000…d3b0</span>;
  }
  if (!isConnected || !address) {
    // Wallets that announce themselves (EIP-6963) appear by name; the generic
    // "injected" entry is whichever extension grabbed window.ethereum, so it is
    // only offered when nothing announced itself.
    const named = connectors.filter((c) => c.id !== "injected");
    const choices = named.length > 0 ? named : connectors;
    if (choices.length <= 1) {
      const only = choices[0];
      return (
        <Button size="sm" onClick={() => only && connect({ connector: only })} loading={isPending} disabled={!only}>
          Connect wallet
        </Button>
      );
    }
    return (
      <div className="relative">
        <Button size="sm" onClick={() => setOpen((o) => !o)} loading={isPending} aria-haspopup="menu" aria-expanded={open}>
          Connect wallet
        </Button>
        {open && (
          <>
            <button type="button" aria-label="Close wallet list" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
            <div role="menu" aria-label="Choose a wallet" className="glass absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-[18px] [--inset:56px]">
              <div className="ios-header pt-3">Choose a wallet</div>
              {choices.map((c) => (
                <button
                  key={c.uid}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    connect({ connector: c });
                  }}
                  className="ios-row w-full text-left hover:bg-sunk/60"
                >
                  {c.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.icon} alt="" className="size-7 rounded-[7px]" />
                  ) : (
                    <span className="ios-icon size-7 bg-accent text-[12px]">{c.name.slice(0, 1)}</span>
                  )}
                  <span className="flex-1 text-[15px] font-medium">{c.name}</span>
                </button>
              ))}
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
