"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet } from "./useEarlyout";
import { MODE } from "@/lib/addresses";
import { mockEmpty } from "@/lib/demo";
import { toSaleRow, type SaleRow } from "@/lib/salesRows";
import { mockBook } from "@/lib/source/mockBook";

/// The connected wallet's sales, newest first. Mock mode builds them from the
/// sample book (claims the mock account sold).
export function useSales() {
  const wallet = useWallet();
  const address = wallet.address;
  return useQuery({
    queryKey: ["sales", address, mockEmpty()],
    enabled: !!address,
    refetchInterval: 60_000,
    queryFn: async (): Promise<SaleRow[]> => {
      if (MODE === "mock") {
        if (mockEmpty()) return [];
        const now = Math.floor(Date.now() / 1000);
        return mockBook()
          .claims.filter((c) => c.seller.toLowerCase() === address!.toLowerCase())
          .map((c) =>
            toSaleRow(
              { claimId: BigInt(c.claimId), amount: BigInt(c.amount), usdcPaid: BigInt(c.usdcPaid), baseBps: c.baseBps, utilBps: c.utilBps, timeBps: c.timeBps, creditBps: c.creditBps, txHash: c.txHash, blockTime: c.soldAt },
              { symbol: c.symbol, settleAt: c.settleAt },
              now,
            ),
          )
          .sort((a, b) => b.soldAt - a.soldAt);
      }
      const res = await fetch(`/api/sales?address=${address}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not read your sales");
      return body.sales as SaleRow[];
    },
  });
}
