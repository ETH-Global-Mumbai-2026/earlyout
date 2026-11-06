import { isAddress, type Address } from "viem";

/// Contract addresses come from NEXT_PUBLIC_* env vars, written by
/// `pnpm sync-addresses` from contracts/deployments/arc-testnet.json.
/// Mock mode is opt-in only (NEXT_PUBLIC_MODE=mock) and never a fallback.

export const MODE: "mock" | "chain" = process.env.NEXT_PUBLIC_MODE === "mock" ? "mock" : "chain";

const raw = {
  registry: process.env.NEXT_PUBLIC_FUND_REGISTRY,
  oracle: process.env.NEXT_PUBLIC_NAV_ORACLE,
  issuer: process.env.NEXT_PUBLIC_ISSUER_STUB,
  claims: process.env.NEXT_PUBLIC_CLAIM_TOKEN,
  wrapper: process.env.NEXT_PUBLIC_CLAIM_WRAPPER,
  vault: process.env.NEXT_PUBLIC_VAULT,
} as const;

export type Addresses = { [K in keyof typeof raw]: Address };

export const missingAddresses = (Object.keys(raw) as (keyof typeof raw)[]).filter(
  (k) => !raw[k] || !isAddress(raw[k] as string),
);

export const configured = MODE === "mock" || missingAddresses.length === 0;

export const addresses = raw as unknown as Addresses;
