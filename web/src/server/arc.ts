import "server-only";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "@/lib/chain";
import { serverEnv } from "./env";

export const arcPublic = createPublicClient({ chain: arcTestnet, transport: http(serverEnv.arcRpc) });

export function opsWallet() {
  if (!serverEnv.opsKey) return null;
  return createWalletClient({ chain: arcTestnet, transport: http(serverEnv.arcRpc), account: privateKeyToAccount(serverEnv.opsKey) });
}
