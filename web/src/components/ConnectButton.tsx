"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { arcTestnet } from "@/lib/chain";
import { MODE } from "@/lib/addresses";
import { shortAddr } from "@/lib/format";
import { Button } from "./ui";

export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();

  if (MODE === "mock") {
    return <span className="t-caption shrink-0 rounded-full bg-surface-2 px-3 py-1.5">Demo data</span>;
  }
  if (!isConnected || !address) {
    const injected = connectors[0];
    return (
      <Button size="sm" onClick={() => injected && connect({ connector: injected })} loading={isPending} disabled={!injected}>
        Connect
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
      <span className="t-mono">{shortAddr(address)}</span>
    </Button>
  );
}
