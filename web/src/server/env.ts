import "server-only";
import { isAddress, isHex } from "viem";

/// Server-side configuration, validated once. Secrets never reach the client.
function optionalAddress(name: string) {
  const v = process.env[name];
  if (v && !isAddress(v)) throw new Error(`${name} is not an address`);
  return v as `0x${string}` | undefined;
}

function optionalKey(name: string) {
  const v = process.env[name];
  if (v && !(isHex(v) && v.length === 66)) throw new Error(`${name} must be a 32-byte hex private key`);
  return v as `0x${string}` | undefined;
}

export const serverEnv = {
  mode: process.env.NEXT_PUBLIC_MODE === "mock" ? ("mock" as const) : ("chain" as const),
  arcRpc: process.env.ARC_RPC ?? process.env.NEXT_PUBLIC_ARC_RPC ?? "https://rpc.testnet.arc.io",
  issuer: optionalAddress("NEXT_PUBLIC_ISSUER_STUB"),
  opsKey: optionalKey("OPS_PRIVATE_KEY"),
  demoToken: process.env.DEMO_TOKEN,
};
