import "server-only";
import { createPublicClient, createWalletClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { http, isHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const accessKey = process.env.ARKIV_ACCESS_KEY ?? "";
export const arkivChain = rabdi({ accessKey });

export const arkivPublic = createPublicClient({ chain: arkivChain, transport: http() });

export function arkivWriter() {
  const key = process.env.ARKIV_WRITER_PRIVATE_KEY;
  if (!key || !isHex(key) || key.length !== 66) return null;
  const account = privateKeyToAccount(key);
  return { account, client: createWalletClient({ chain: arkivChain, transport: http(), account }) };
}

export const ARKIV_EXPLORER = "https://rabdi.explorer.arkiv.network";
