/// Circle CCTP V2 on testnet: domains, contracts and the Forwarding Service,
/// which mints on the destination chain for the user and takes its fee from
/// the minted USDC, so the user needs no gas there.

export type CctpChainKey = "arc" | "base" | "ethereum";

export type CctpChain = {
  key: CctpChainKey;
  name: string;
  domain: number;
  chainId: number;
  usdc: `0x${string}`;
  tokenMessenger: `0x${string}`;
  explorer: string;
};

/// TokenMessengerV2 has the same address on every CCTP V2 testnet.
const TOKEN_MESSENGER = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA" as const;

export const CCTP_CHAINS: Record<CctpChainKey, CctpChain> = {
  arc: {
    key: "arc",
    name: "Arc",
    domain: 26,
    chainId: 5042002,
    usdc: "0x3600000000000000000000000000000000000000",
    tokenMessenger: TOKEN_MESSENGER,
    explorer: "https://explorer.testnet.arc.io",
  },
  base: {
    key: "base",
    name: "Base",
    domain: 6,
    chainId: 84532,
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    tokenMessenger: TOKEN_MESSENGER,
    explorer: "https://sepolia.basescan.org",
  },
  ethereum: {
    key: "ethereum",
    name: "Ethereum",
    domain: 0,
    chainId: 11155111,
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    tokenMessenger: TOKEN_MESSENGER,
    explorer: "https://sepolia.etherscan.io",
  },
};

export const IRIS_SANDBOX = "https://iris-api-sandbox.circle.com";

/// "cctp-forward" in 24 bytes, then version 0 and an empty length (v0, no extra data).
export const FORWARD_HOOK = "0x636374702d666f72776172640000000000000000000000000000000000000000" as const;

/// Standard (finalized) transfer: the cost is the forwarding fee alone.
export const FINALITY_STANDARD = 1000;

export function toBytes32(address: string): `0x${string}` {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error(`Not an address: ${address}`);
  return `0x${"0".repeat(24)}${address.slice(2).toLowerCase()}`;
}

export type FeeRow = { finalityThreshold: number; minimumFee: number; forwardFee: { low: number; med: number; high: number } };

/// Most USDC (6dp) to let Circle take: the median forwarding fee plus the
/// protocol fee (minimumFee is in basis points of the amount), with a 10%
/// margin, rounded up. Circle keeps the whole maxFee, so the margin is small.
export function maxFeeFor(rows: FeeRow[], amount: bigint, finality = FINALITY_STANDARD): bigint {
  const row = rows.find((r) => r.finalityThreshold === finality);
  if (!row) throw new Error("No fee quote for this transfer");
  const protocol = (amount * BigInt(Math.round(row.minimumFee * 100))) / 1_000_000n;
  const base = BigInt(row.forwardFee.med) + protocol;
  return (base * 11n + 9n) / 10n;
}

/// What lands on the destination chain: the burned amount less the max fee.
export function receivedAfterFee(burned: bigint, maxFee: bigint): bigint {
  return burned > maxFee ? burned - maxFee : 0n;
}

type IrisMessage = { status?: string; forwardState?: string; forwardTxHash?: string };

export type ForwardStatus = { state: "pending" } | { state: "complete"; destinationTx: string } | { state: "failed" };

/// Reads Circle's `/v2/messages/{domain}?transactionHash=` response.
export function forwardStatus(body: { messages?: IrisMessage[] }): ForwardStatus {
  const m = body.messages?.[0];
  if (!m) return { state: "pending" };
  if (m.forwardState === "FAILED") return { state: "failed" };
  if (m.forwardTxHash) return { state: "complete", destinationTx: m.forwardTxHash };
  return { state: "pending" };
}
