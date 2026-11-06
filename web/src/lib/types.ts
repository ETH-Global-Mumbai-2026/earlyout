import type { Address, Hex } from "viem";

export type Verdict = "BUY" | "REFUSE" | "HALT";

export type Fund = {
  address: Address;
  symbol: string;
  name: string;
  nav: bigint; // 18dp
  navUpdatedAt: number;
  status: 0 | 1;
  impaired: boolean;
  settlementDelay: number;
  window: number;
  maxAge: number;
  capUsdc: bigint;
  deployedUsdc: bigint;
};

export type Quote = {
  verdict: Verdict;
  reason: string;
  nav: bigint;
  navUpdatedAt: number;
  baseBps: number;
  utilBps: number;
  timeBps: number;
  creditBps: number;
  payout: bigint;
  capacityLeft: bigint;
  settleAt: number;
  value: bigint; // amount at NAV, 6dp
};

export type VaultState = {
  totalAssets: bigint;
  idle: bigint;
  deployed: bigint;
  sharePrice: bigint; // USDC per whole share, 6dp
  totalSupply: bigint;
  shareDecimals: number;
};

export type Account = {
  address: Address;
  usdc: bigint;
  fundBalances: Record<string, bigint>;
  shares: bigint;
  sharesValue: bigint;
  maxWithdraw: bigint;
  maxDeposit: bigint;
};

export type Receipt = { hash: Hex; claimId?: bigint; payout?: bigint };

export interface Source {
  readonly mode: "mock" | "chain";
  funds(): Promise<Fund[]>;
  quote(fund: Address, amount: bigint): Promise<Quote>;
  vault(): Promise<VaultState>;
  account(address: Address): Promise<Account>;
  issuerFailed(): Promise<boolean>;
  sell(fund: Address, amount: bigint, minPayout: bigint): Promise<Receipt>;
  deposit(amount: bigint): Promise<Receipt>;
  withdraw(amount: bigint): Promise<Receipt>;
  markImpaired(fund: Address): Promise<Receipt>;
}

export function roundUpToWindow(t: number, window: number) {
  return window === 0 ? t : Math.ceil(t / window) * window;
}

export function bpsSum(q: Pick<Quote, "baseBps" | "utilBps" | "timeBps" | "creditBps">) {
  return q.baseBps + q.utilBps + q.timeBps + q.creditBps;
}
