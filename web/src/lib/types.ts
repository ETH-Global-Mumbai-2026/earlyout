import type { CctpChainKey } from "./cctp";
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
  volBps: number;
  creditBps: number;
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
  baseBps: number; // FundRegistry globals: the vault-wide spread terms
  utilSlopeBps: number;
};

export type Account = {
  address: Address;
  usdc: bigint;
  fundBalances: Record<string, bigint>;
  shares: bigint;
  sharesValue: bigint;
  maxWithdraw: bigint;
  maxDeposit: bigint;
  claimAllowlisted: boolean; // may hold claims, so may buy one from the vault
};

export type Receipt = { hash: Hex; claimId?: bigint; payout?: bigint; bridge?: { to: CctpChainKey; maxFee: bigint } };

/// What the vault holds in one claim id, priced for a buyer: NAV minus the
/// time and credit terms for the time left. The buyer collects full NAV at payout.
export type ClaimPosition = {
  claimId: bigint;
  fund: Address;
  symbol: string;
  settleAt: number;
  held: bigint; // claim units the vault holds (18dp)
  cost: bigint; // USDC the vault paid for them (6dp)
  nav: bigint; // 18dp
  timeBps: number;
  creditBps: number;
  amount: bigint; // units priced (18dp)
  price: bigint; // USDC a buyer pays for `amount` (6dp)
  value: bigint; // `amount` at NAV (6dp), what the issuer pays at payout
  verdict: Verdict; // HALT blocks buying too
  reason: string;
};

/// A claim a wallet holds after buying it from the vault.
export type Holding = {
  claimId: bigint;
  fund: Address;
  symbol: string;
  settleAt: number;
  amount: bigint; // units held (18dp)
  nav: bigint; // 18dp
  collected: boolean; // issuer already paid the wrapper for this claim
  value: bigint; // amount at NAV (6dp)
};

export interface Source {
  readonly mode: "mock" | "chain";
  funds(): Promise<Fund[]>;
  quote(fund: Address, amount: bigint): Promise<Quote>;
  vault(): Promise<VaultState>;
  account(address: Address): Promise<Account>;
  issuerFailed(): Promise<boolean>;
  sell(fund: Address, amount: bigint, minPayout: bigint): Promise<Receipt>;
  /// Sell and have Circle CCTP deliver the USDC to the same address on another chain.
  sellAndBridge(fund: Address, amount: bigint, minPayout: bigint, to: CctpChainKey, maxFee: bigint): Promise<Receipt>;
  deposit(amount: bigint): Promise<Receipt>;
  withdraw(amount: bigint): Promise<Receipt>;
  markImpaired(fund: Address): Promise<Receipt>;
  claimPosition(claimId: bigint, amount?: bigint): Promise<ClaimPosition>;
  buy(claimId: bigint, amount: bigint, maxCost: bigint): Promise<Receipt>;
  holdings(address: Address): Promise<Holding[]>;
  redeem(claimId: bigint, amount: bigint): Promise<Receipt>;
}

export function roundUpToWindow(t: number, window: number) {
  return window === 0 ? t : Math.ceil(t / window) * window;
}

export function bpsSum(q: Pick<Quote, "baseBps" | "utilBps" | "timeBps" | "creditBps">) {
  return q.baseBps + q.utilBps + q.timeBps + q.creditBps;
}
