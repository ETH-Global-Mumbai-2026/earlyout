"use client";

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

  if (MODE === "mock") {
    return <span className="num rounded-xl border border-line-strong bg-surface px-3 py-1.5 text-xs text-muted">0x0000…d3b0</span>;
  }
  if (!isConnected || !address) {
    const injected = connectors[0];
    return (
      <Button size="sm" onClick={() => injected && connect({ connector: injected })} loading={isPending} disabled={!injected}>
        Connect wallet
      </Button>
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
