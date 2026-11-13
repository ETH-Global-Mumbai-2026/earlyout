"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { source } from "@/lib/source";
import { MODE } from "@/lib/addresses";

const MOCK_ACCOUNT = "0x000000000000000000000000000000000000d3b0" as Address;

export function useWallet() {
  const acc = useAccount();
  if (MODE === "mock") return { address: MOCK_ACCOUNT, isConnected: true, chainId: 5042002 };
  return { address: acc.address, isConnected: acc.isConnected, chainId: acc.chainId };
}

export function useFunds() {
  return useQuery({ queryKey: ["funds"], queryFn: () => source.funds(), refetchInterval: 60_000 });
}

export function useQuote(fund: Address | undefined, amount: bigint | null) {
  return useQuery({
    queryKey: ["quote", fund, amount?.toString()],
    queryFn: () => source.quote(fund!, amount!),
    enabled: !!fund && amount !== null,
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useVault() {
  return useQuery({ queryKey: ["vault"], queryFn: () => source.vault(), refetchInterval: 60_000 });
}

export function useAccountState() {
  const { address } = useWallet();
  return useQuery({
    queryKey: ["account", address],
    queryFn: () => source.account(address!),
    enabled: !!address,
    refetchInterval: 30_000,
  });
}

export function useIssuerFailed() {
  return useQuery({ queryKey: ["issuerFailed"], queryFn: () => source.issuerFailed(), refetchInterval: 20_000 });
}

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export function useSell() {
  const done = useInvalidateAll();
  return useMutation({
    mutationFn: (v: { fund: Address; amount: bigint; minPayout: bigint }) => source.sell(v.fund, v.amount, v.minPayout),
    onSuccess: (r) => {
      // Index this sale into Arkiv right away, from its receipt; the Book reads from there.
      void fetch("/api/arkiv/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tx: r.hash }) }).catch(() => undefined);
    },
    onSettled: done,
  });
}

export function useDeposit() {
  const done = useInvalidateAll();
  return useMutation({ mutationFn: (amount: bigint) => source.deposit(amount), onSettled: done });
}

export function useWithdraw() {
  const done = useInvalidateAll();
  return useMutation({ mutationFn: (amount: bigint) => source.withdraw(amount), onSettled: done });
}

/// What the vault holds in a claim and what `amount` of it costs a buyer.
export function useClaimPosition(claimId: bigint | undefined, amount: bigint | null) {
  return useQuery({
    queryKey: ["claim", claimId?.toString(), amount?.toString()],
    queryFn: () => source.claimPosition(claimId!, amount ?? undefined),
    enabled: claimId !== undefined,
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useBuy() {
  const done = useInvalidateAll();
  return useMutation({
    mutationFn: (v: { claimId: bigint; amount: bigint; maxCost: bigint }) => source.buy(v.claimId, v.amount, v.maxCost),
    onSuccess: (r) => {
      // Record the buy on Arkiv right away, so the Book updates within seconds.
      if (MODE !== "chain") return;
      void fetch("/api/arkiv/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tx: r.hash }) }).catch(() => undefined);
    },
    onSettled: done,
  });
}

/// The claims the connected wallet holds, bought from the vault.
export function useHoldings() {
  const { address } = useWallet();
  return useQuery({
    queryKey: ["holdings", address],
    queryFn: () => source.holdings(address!),
    enabled: !!address,
    refetchInterval: 30_000,
  });
}

export function useRedeem() {
  const done = useInvalidateAll();
  return useMutation({ mutationFn: (v: { claimId: bigint; amount: bigint }) => source.redeem(v.claimId, v.amount), onSettled: done });
}

export function useMarkImpaired() {
  const done = useInvalidateAll();
  return useMutation({ mutationFn: (fund: Address) => source.markImpaired(fund), onSettled: done });
}

export function useSetIssuerFailed() {
  const done = useInvalidateAll();
  return useMutation({
    mutationFn: async (failed: boolean) => {
      if (MODE === "mock") {
        const { setMockIssuerFailed } = await import("@/lib/source/mock");
        setMockIssuerFailed(failed);
        return { status: failed ? ("FAILED" as const) : ("OK" as const) };
      }
      const res = await fetch("/api/issuer-status", {
        method: "POST",
        headers: { "content-type": "application/json", "x-demo-token": demoKey() },
        body: JSON.stringify({ failed }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not update issuer status");
      return res.json() as Promise<{ status: "OK" | "FAILED"; hash?: string }>;
    },
    onSettled: done,
  });
}

export function usePushNav() {
  const done = useInvalidateAll();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/nav/push", { method: "POST", headers: { "x-demo-token": demoKey() } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not push NAV");
      return body as { results: { fund: string; nav: string; hash: string }[] };
    },
    onSettled: done,
  });
}

export function useGetTestTokens() {
  const done = useInvalidateAll();
  return useMutation({
    mutationFn: async (address: Address) => {
      const res = await fetch("/api/demo/judge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not set up the demo wallet");
      return body as { ok: boolean; transactions?: string[] };
    },
    onSettled: done,
  });
}

export function demoKey(): string {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem("earlyout-demo-key") ?? "";
}

export function setDemoKey(v: string) {
  window.sessionStorage.setItem("earlyout-demo-key", v.trim());
}

export function errorMessage(e: unknown): string {
  if (!e) return "";
  const msg = e instanceof Error ? e.message : String(e);
  if (/user rejected|denied/i.test(msg)) return "You cancelled the transaction";
  const m = msg.match(/reason:\s*([^\n]+)/i);
  if (m) return m[1].trim();
  return msg.split("\n")[0].slice(0, 160);
}
