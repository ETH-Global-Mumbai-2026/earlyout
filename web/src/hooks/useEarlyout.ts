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
    onSuccess: () => {
      // Index the sale into Arkiv right away; the Book screen reads from there.
      void fetch("/api/arkiv/sync", { method: "POST" }).catch(() => undefined);
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
      const res = await fetch("/api/nav/push", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not push NAV");
      return body as { results: { fund: string; nav: string; hash: string }[] };
    },
    onSettled: done,
  });
}

export function useTryAsJudge() {
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
