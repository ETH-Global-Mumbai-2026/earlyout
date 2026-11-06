import type { Address, Hex } from "viem";
import { keccak256, encodeAbiParameters, parseAbiParameters } from "viem";
import type { Account, Fund, Receipt, Source, VaultState, Verdict } from "../types";
import { roundUpToWindow } from "../types";

/// In-memory stand-in for the Arc contracts. Same formulas as Vault.sol, so
/// the screens can be exercised without a chain. Opt-in via NEXT_PUBLIC_MODE=mock.

const NAV = 1113_7732n * 10n ** 14n; // 1113.7732 at 18dp, the ACRED feed on Nov 6
const BPS = 10_000n;
const YEAR = 365 * 86400;

type MockFund = Fund & { recoveryBps: number };

function fund(address: Address, symbol: string, name: string, delay: number, window: number): MockFund {
  return {
    address,
    symbol,
    name,
    nav: NAV,
    navUpdatedAt: Math.floor(Date.now() / 1000) - 3600,
    status: 0,
    impaired: false,
    settlementDelay: delay,
    window,
    maxAge: 96 * 3600,
    capUsdc: 20_000_000n,
    deployedUsdc: 0n,
    volBps: 800,
    creditBps: 150,
    recoveryBps: 4000,
  };
}

const state = {
  funds: [
    fund("0x000000000000000000000000000000000000a11a", "ACRED", "Apollo Diversified Credit (stand-in)", 90 * 86400, 86400),
    fund("0x000000000000000000000000000000000000a11b", "ACREDd", "ACRED demo window", 15 * 60, 5 * 60),
  ],
  baseBps: 50,
  utilSlopeBps: 300,
  issuerFailed: false,
  idle: 100_000_000n,
  totalSupply: 100_000_000n * 10n ** 3n,
  user: { usdc: 250_000_000n, shares: 0n, balances: {} as Record<string, bigint> },
  nonce: 1,
};
for (const f of state.funds) state.user.balances[f.address] = 2n * 10n ** 18n;

function sqrt(n: bigint): bigint {
  if (n < 2n) return n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + n / x) / 2n;
  }
  return x;
}

function totalAssets() {
  return state.funds.reduce((acc, f) => {
    const cost = f.impaired ? (f.deployedUsdc * BigInt(f.recoveryBps)) / BPS : f.deployedUsdc;
    return acc + cost;
  }, state.idle);
}

function deployed() {
  return state.funds.reduce((a, f) => a + f.deployedUsdc, 0n);
}

function fakeHash(): Hex {
  return keccak256(encodeAbiParameters(parseAbiParameters("uint256"), [BigInt(state.nonce++)]));
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockSource: Source = {
  mode: "mock",
  async funds() {
    await delay(120);
    return state.funds.map((f) => ({ ...f, status: state.issuerFailed ? 1 : 0 }));
  },
  async quote(fundAddr, amount) {
    await delay(80);
    const f = state.funds.find((x) => x.address === fundAddr);
    if (!f) throw new Error("Unknown fund");
    const now = Math.floor(Date.now() / 1000);
    const settleAt = roundUpToWindow(now + f.settlementDelay, f.window);
    const secs = Math.max(0, settleAt - now);
    const assets = totalAssets();
    const utilBps = assets === 0n ? 0 : Number((BigInt(state.utilSlopeBps) * deployed()) / assets);
    const timeBps = Number((BigInt(f.volBps) * sqrt((BigInt(secs) * 10n ** 18n) / BigInt(YEAR))) / 10n ** 9n);
    const spread = BigInt(state.baseBps + utilBps + timeBps + f.creditBps);
    const value = (amount * f.nav) / 10n ** 30n;
    const payout = spread >= BPS ? 0n : (value * (BPS - spread)) / BPS;
    const status: 0 | 1 = state.issuerFailed ? 1 : 0;
    let verdict: Verdict = "BUY";
    let reason = "";
    if (status === 1) [verdict, reason] = ["HALT", "Issuer reports failure"];
    else if (now - f.navUpdatedAt > f.maxAge) [verdict, reason] = ["HALT", "NAV is stale"];
    else if (f.impaired) [verdict, reason] = ["HALT", "Fund is impaired"];
    else if (amount === 0n) [verdict, reason] = ["REFUSE", "Amount is zero"];
    else if (f.deployedUsdc + payout > f.capUsdc) [verdict, reason] = ["REFUSE", "Over the fund cap"];
    else if (state.idle < payout) [verdict, reason] = ["REFUSE", "Vault short of USDC"];
    return {
      verdict,
      reason,
      nav: f.nav,
      navUpdatedAt: f.navUpdatedAt,
      baseBps: state.baseBps,
      utilBps,
      timeBps,
      creditBps: f.creditBps,
      payout,
      capacityLeft: f.capUsdc > f.deployedUsdc ? f.capUsdc - f.deployedUsdc : 0n,
      settleAt,
      value,
    };
  },
  async vault(): Promise<VaultState> {
    await delay(80);
    const ta = totalAssets();
    return {
      totalAssets: ta,
      idle: state.idle,
      deployed: deployed(),
      sharePrice: state.totalSupply === 0n ? 1_000_000n : (ta * 10n ** 9n) / state.totalSupply,
      totalSupply: state.totalSupply,
      shareDecimals: 9,
      baseBps: state.baseBps,
      utilSlopeBps: state.utilSlopeBps,
    };
  },
  async account(address): Promise<Account> {
    await delay(60);
    const ta = totalAssets();
    const sharesValue = state.totalSupply === 0n ? 0n : (state.user.shares * ta) / state.totalSupply;
    return {
      address,
      usdc: state.user.usdc,
      fundBalances: { ...state.user.balances },
      shares: state.user.shares,
      sharesValue,
      maxWithdraw: sharesValue < state.idle ? sharesValue : state.idle,
      maxDeposit: 2n ** 200n,
    };
  },
  async issuerFailed() {
    return state.issuerFailed;
  },
  async sell(fundAddr, amount, minPayout): Promise<Receipt> {
    await delay(900);
    const q = await this.quote(fundAddr, amount);
    if (q.verdict !== "BUY") throw new Error(`${q.verdict}: ${q.reason}`);
    if (q.payout < minPayout) throw new Error("Price moved below your minimum");
    const f = state.funds.find((x) => x.address === fundAddr)!;
    if (state.user.balances[f.address] < amount) throw new Error("Not enough fund tokens");
    state.user.balances[f.address] -= amount;
    state.user.usdc += q.payout;
    state.idle -= q.payout;
    f.deployedUsdc += q.payout;
    const claimId = BigInt(
      keccak256(encodeAbiParameters(parseAbiParameters("address, uint64"), [f.address, BigInt(q.settleAt)])),
    );
    return { hash: fakeHash(), claimId, payout: q.payout };
  },
  async deposit(amount): Promise<Receipt> {
    await delay(700);
    if (amount > state.user.usdc) throw new Error("Not enough USDC");
    const ta = totalAssets();
    const shares = ta === 0n ? amount * 1000n : (amount * state.totalSupply) / ta;
    state.user.usdc -= amount;
    state.idle += amount;
    state.user.shares += shares;
    state.totalSupply += shares;
    return { hash: fakeHash() };
  },
  async withdraw(amount): Promise<Receipt> {
    await delay(700);
    const ta = totalAssets();
    const shares = (amount * state.totalSupply + ta - 1n) / ta;
    if (shares > state.user.shares) throw new Error("More than your balance");
    if (amount > state.idle) throw new Error("Vault short of idle USDC");
    state.user.shares -= shares;
    state.totalSupply -= shares;
    state.idle -= amount;
    state.user.usdc += amount;
    return { hash: fakeHash() };
  },
  async markImpaired(fundAddr): Promise<Receipt> {
    await delay(700);
    if (!state.issuerFailed) throw new Error("Issuer has not failed");
    const f = state.funds.find((x) => x.address === fundAddr)!;
    f.impaired = true;
    return { hash: fakeHash() };
  },
};

/// Demo switch, used by the status API route in mock mode.
export function setMockIssuerFailed(v: boolean) {
  state.issuerFailed = v;
}
export function mockIssuerFailed() {
  return state.issuerFailed;
}
