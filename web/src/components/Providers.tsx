"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/chain";

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({
        defaultOptions: {
          // Arc's public RPC rate-limits bursts: back off and retry rather than show an error.
          queries: { staleTime: 10_000, retry: 4, retryDelay: (n) => Math.min(8_000, 600 * 2 ** n), refetchOnWindowFocus: false },
        },
      }));
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
