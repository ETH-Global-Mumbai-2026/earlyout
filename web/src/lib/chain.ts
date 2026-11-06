import { defineChain } from "viem";
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_ARC_RPC ?? "https://rpc.testnet.arc.io"] } },
  blockExplorers: { default: { name: "Arc Explorer", url: "https://explorer.testnet.arc.io" } },
  contracts: { multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" } },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  connectors: [injected()],
  // Arc's public RPC rate-limits bursts and caps batch size. Contract reads in the
  // same tick fold into one Multicall3 call; the rest go out in small JSON-RPC batches.
  batch: { multicall: { wait: 25 } },
  transports: { [arcTestnet.id]: http(undefined, { batch: { wait: 25, batchSize: 10 }, retryCount: 3, retryDelay: 400 }) },
  ssr: true,
});

export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;

export function txUrl(hash: string) {
  return `${arcTestnet.blockExplorers.default.url}/tx/${hash}`;
}
