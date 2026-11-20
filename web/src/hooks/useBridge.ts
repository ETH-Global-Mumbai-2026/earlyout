"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { source } from "@/lib/source";
import { MODE, payoutRouter } from "@/lib/addresses";
import { receivedAfterFee, type CctpChainKey, type ForwardStatus } from "@/lib/cctp";
import { circleAccount } from "@/lib/circle/wallet";

/// Whether sellers can choose another chain for their payout.
export const bridgeAvailable = MODE === "mock" || !!payoutRouter;

/// Circle's forwarding fee for paying `amount` (6dp) out to `to`, and what arrives there.
export function useBridgeFee(from: CctpChainKey, to: CctpChainKey, amount: bigint | undefined) {
  return useQuery({
    queryKey: ["bridge-fee", from, to, amount?.toString()],
    enabled: from !== to && !!amount && amount > 0n,
    staleTime: 30_000,
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<{ maxFee: bigint; received: bigint }> => {
      if (MODE === "mock") {
        const maxFee = to === "ethereum" ? 203_570n : 58_529n;
        return { maxFee, received: receivedAfterFee(amount!, maxFee) };
      }
      const res = await fetch(`/api/cctp/fee?from=${from}&to=${to}&amount=${amount}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Fee quote failed");
      return { maxFee: BigInt(body.maxFee), received: BigInt(body.received) };
    },
  });
}

export function useSellAndBridge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { fund: Address; amount: bigint; minPayout: bigint; to: CctpChainKey; maxFee: bigint }) =>
      source.sellAndBridge(v.fund, v.amount, v.minPayout, v.to, v.maxFee),
    onSuccess: (r) => {
      if (MODE !== "chain") return;
      void fetch("/api/arkiv/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tx: r.hash }) }).catch(() => undefined);
    },
    onSettled: () => qc.invalidateQueries(),
  });
}

/// Polls Circle until the forwarded USDC is minted on the destination chain.
export function useBridgeStatus(hash: string | undefined, from: CctpChainKey = "arc") {
  return useQuery({
    queryKey: ["bridge-status", from, hash],
    enabled: !!hash,
    refetchInterval: (q) => (q.state.data?.state === "pending" || !q.state.data ? 10_000 : false),
    queryFn: async (): Promise<ForwardStatus> => {
      if (MODE === "mock") return { state: "complete", destinationTx: `0x${"ab".repeat(32)}` };
      const res = await fetch(`/api/cctp/status?from=${from}&tx=${hash}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Status check failed");
      return body as ForwardStatus;
    },
  });
}

/// Burns USDC on another chain through Circle CCTP with forwarding, so Circle
/// mints it to the same address on Arc. Returns the burn transaction.
export function useBridgeIn() {
  return useMutation({
    mutationFn: async (v: { from: Exclude<CctpChainKey, "arc">; amount: bigint; maxFee: bigint }): Promise<`0x${string}`> => {
      if (MODE === "mock") {
        await new Promise((r) => setTimeout(r, 900));
        return `0x${"cd".repeat(32)}`;
      }
      if (circleAccount()) throw new Error("Your Circle wallet lives on Arc. Use a browser wallet to send USDC from another chain.");
      const { bridgeIn } = await import("@/lib/source/bridgeIn");
      return bridgeIn(v.from, v.amount, v.maxFee);
    },
  });
}
