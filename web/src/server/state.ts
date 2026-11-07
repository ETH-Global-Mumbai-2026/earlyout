import "server-only";
import type { Address, Hex } from "viem";
import { createPublicClient, erc20Abi as viemErc20, http } from "viem";
import { arcTestnet, USDC_ADDRESS } from "@/lib/chain";
import { addresses } from "@/lib/addresses";
import { erc20Abi, issuerAbi, oracleAbi, registryAbi, vaultAbi } from "@/lib/abi";
import type { Account, Fund, Quote, VaultState, Verdict } from "@/lib/types";
import { roundUpToWindow } from "@/lib/types";
import { serverEnv } from "./env";

/// Read-side of the app, served from our own API so visitors never call Arc's
/// public RPC for it. One multicall per refresh, cached for a few seconds here
/// and at the edge, so one read serves every visitor.

const client = createPublicClient({ chain: arcTestnet, transport: http(serverEnv.arcRpc, { retryCount: 3, retryDelay: 500 }), batch: { multicall: { wait: 16, batchSize: 65_536 } } });
const VERDICTS: Verdict[] = ["BUY", "REFUSE", "HALT"];
const TTL_MS = 10_000;

type State = { funds: Fund[]; vault: VaultState };
let cached: { at: number; value: Promise<State> } | null = null;
let lastGood: { at: number; value: State } | null = null;
const STALE_OK_MS = 5 * 60_000;

async function read(): Promise<State> {
  const v = addresses.vault;
  const list = await client.readContract({ address: addresses.registry, abi: registryAbi, functionName: "funds" });
  const [funds, vault] = await Promise.all([
    Promise.all(
      list.map(async (address: Address): Promise<Fund> => {
        const [terms, nav, impaired, cost, name, symbol] = await Promise.all([
          client.readContract({ address: addresses.registry, abi: registryAbi, functionName: "getTerms", args: [address] }),
          client.readContract({ address: addresses.oracle, abi: oracleAbi, functionName: "getNav", args: [address] }),
          client.readContract({ address: v, abi: vaultAbi, functionName: "impaired", args: [address] }),
          client.readContract({ address: v, abi: vaultAbi, functionName: "fundCost", args: [address] }),
          client.readContract({ address, abi: erc20Abi, functionName: "name" }),
          client.readContract({ address, abi: erc20Abi, functionName: "symbol" }),
        ]);
        return {
          address,
          symbol,
          name,
          nav: nav[0],
          navUpdatedAt: Number(nav[1]),
          status: nav[2] === 1 ? 1 : 0,
          impaired,
          settlementDelay: Number(terms.settlementDelay),
          window: Number(terms.window),
          maxAge: Number(terms.maxAge),
          capUsdc: terms.exposureCapUsdc,
          deployedUsdc: cost,
          volBps: Number(terms.volBps),
          creditBps: Number(terms.creditBps),
        };
      }),
    ),
    (async (): Promise<VaultState> => {
      const [totalAssets, deployed, totalSupply, decimals, idle, baseBps, utilSlopeBps] = await Promise.all([
        client.readContract({ address: v, abi: vaultAbi, functionName: "totalAssets" }),
        client.readContract({ address: v, abi: vaultAbi, functionName: "deployedUsdc" }),
        client.readContract({ address: v, abi: vaultAbi, functionName: "totalSupply" }),
        client.readContract({ address: v, abi: vaultAbi, functionName: "decimals" }),
        client.readContract({ address: USDC_ADDRESS, abi: viemErc20, functionName: "balanceOf", args: [v] }),
        client.readContract({ address: addresses.registry, abi: registryAbi, functionName: "baseBps" }),
        client.readContract({ address: addresses.registry, abi: registryAbi, functionName: "utilSlopeBps" }),
      ]);
      const sharePrice = await client.readContract({ address: v, abi: vaultAbi, functionName: "convertToAssets", args: [10n ** BigInt(decimals)] });
      return { totalAssets, idle, deployed, sharePrice, totalSupply, shareDecimals: decimals, baseBps, utilSlopeBps };
    })(),
  ]);
  return { funds, vault };
}

/// Fresh state, or the last good snapshot (up to five minutes old) if Arc's
/// public RPC is rate-limiting us. A slightly old price beats an error page;
/// the contract still checks freshness on every sale.
export function readState(): Promise<State> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  const value = read()
    .then((s) => {
      lastGood = { at: Date.now(), value: s };
      return s;
    })
    .catch((e: unknown) => {
      if (cached?.value === value) cached = null;
      if (lastGood && Date.now() - lastGood.at < STALE_OK_MS) return lastGood.value;
      throw e;
    });
  cached = { at: Date.now(), value };
  return value;
}

const quoteCache = new Map<string, { at: number; value: Promise<Quote> }>();
const MAX_AMOUNT = 10n ** 30n; // a trillion fund units at 18 decimals

/// The Vault's quote, cached ten seconds per (fund, amount). Only listed funds
/// reach the RPC, and amounts are clamped.
export function readQuote(fund: Address, amount: bigint): Promise<Quote> {
  if (amount <= 0n || amount > MAX_AMOUNT) return Promise.reject(new Error("Amount out of range"));
  const key = `${fund.toLowerCase()}:${amount}`;
  const hit = quoteCache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const value = quoteUncached(fund, amount);
  if (quoteCache.size > 500) quoteCache.clear();
  quoteCache.set(key, { at: Date.now(), value });
  value.catch(() => quoteCache.delete(key));
  return value;
}

async function quoteUncached(fund: Address, amount: bigint): Promise<Quote> {
  const { funds } = await readState();
  const t = funds.find((f) => f.address.toLowerCase() === fund.toLowerCase());
  if (!t) throw new Error("Fund not listed");
  const q = await client.readContract({ address: addresses.vault, abi: vaultAbi, functionName: "quoteFund", args: [t.address, amount] });
  const now = Math.floor(Date.now() / 1000);
  return {
    verdict: VERDICTS[q.verdict] ?? "HALT",
    reason: q.reason,
    nav: q.nav,
    navUpdatedAt: Number(q.navUpdatedAt),
    baseBps: q.baseBps,
    utilBps: q.utilBps,
    timeBps: q.timeBps,
    creditBps: q.creditBps,
    payout: q.payout,
    capacityLeft: q.capacityLeft,
    settleAt: roundUpToWindow(now + t.settlementDelay, t.window),
    value: (amount * q.nav) / 10n ** 30n,
  };
}

/// Drop the cache after a write so the next read shows it. Callable from a
/// public route, so it takes effect at most once every five seconds.
let lastInvalidated = 0;
export function invalidateState(): boolean {
  if (Date.now() - lastInvalidated < 5_000) return false;
  lastInvalidated = Date.now();
  cached = null;
  return true;
}

/// A wallet's balances, read here so the browser never polls Arc's public RPC
/// (it rate-limits per visitor IP). One multicall per wallet, cached a few seconds.
const accountCache = new Map<string, { at: number; value: Promise<Account> }>();
const ACCOUNT_TTL_MS = 4_000;

export function readAccount(address: Address, fresh = false): Promise<Account> {
  const key = address.toLowerCase();
  const hit = accountCache.get(key);
  if (!fresh && hit && Date.now() - hit.at < ACCOUNT_TTL_MS) return hit.value;
  const value = accountUncached(address);
  if (accountCache.size > 1000) accountCache.clear();
  accountCache.set(key, { at: Date.now(), value });
  value.catch(() => accountCache.delete(key));
  return value;
}

async function accountUncached(address: Address): Promise<Account> {
  const { funds } = await readState();
  const v = addresses.vault;
  const [usdc, shares, maxWithdraw, maxDeposit, ...balances] = await Promise.all([
    client.readContract({ address: USDC_ADDRESS, abi: viemErc20, functionName: "balanceOf", args: [address] }),
    client.readContract({ address: v, abi: vaultAbi, functionName: "balanceOf", args: [address] }),
    client.readContract({ address: v, abi: vaultAbi, functionName: "maxWithdraw", args: [address] }),
    client.readContract({ address: v, abi: vaultAbi, functionName: "maxDeposit", args: [address] }),
    ...funds.map((f) => client.readContract({ address: f.address, abi: viemErc20, functionName: "balanceOf", args: [address] })),
  ]);
  const sharesValue = shares === 0n ? 0n : await client.readContract({ address: v, abi: vaultAbi, functionName: "convertToAssets", args: [shares] });
  return { address, usdc, fundBalances: Object.fromEntries(funds.map((f, i) => [f.address, balances[i]])), shares, sharesValue, maxWithdraw, maxDeposit };
}

/// Only tokens and spenders the app itself uses, so the route cannot be used as a general RPC.
export async function readAllowance(token: Address, owner: Address, spender: Address): Promise<bigint> {
  const { funds } = await readState();
  const tokens = new Set([USDC_ADDRESS.toLowerCase(), ...funds.map((f) => f.address.toLowerCase())]);
  const spenders = new Set([addresses.vault, addresses.wrapper].filter(Boolean).map((a) => a.toLowerCase()));
  if (!tokens.has(token.toLowerCase()) || !spenders.has(spender.toLowerCase())) throw new Error("Unsupported token or spender");
  return client.readContract({ address: token, abi: viemErc20, functionName: "allowance", args: [owner, spender] });
}

export type WireReceipt = { status: "pending" | "success" | "reverted"; logs: { address: Address; data: Hex; topics: Hex[] }[] };

/// A transaction's receipt, for the browser to poll while it waits.
export async function readReceipt(hash: Hex): Promise<WireReceipt> {
  try {
    const r = await client.getTransactionReceipt({ hash });
    return { status: r.status, logs: r.logs.map((l) => ({ address: l.address, data: l.data, topics: l.topics as Hex[] })) };
  } catch (e) {
    if (e instanceof Error && /could not be found|not found/i.test(e.message)) return { status: "pending", logs: [] };
    throw e;
  }
}

let issuerCache: { at: number; value: Promise<boolean> } | null = null;
let issuerLastGood: { at: number; value: boolean } | null = null;
/// IssuerStub.failed(), cached five seconds; dropped when the demo switch flips it.
/// If Arc's RPC is rate-limiting us, the last reading from the past five minutes stands in.
export function readIssuerFailed(fresh = false): Promise<boolean> {
  if (!fresh && issuerCache && Date.now() - issuerCache.at < 5_000) return issuerCache.value;
  if (!serverEnv.issuer) return Promise.reject(new Error("NEXT_PUBLIC_ISSUER_STUB is not set"));
  const value = client
    .readContract({ address: serverEnv.issuer, abi: issuerAbi, functionName: "failed" })
    .then((v) => {
      issuerLastGood = { at: Date.now(), value: v };
      return v;
    })
    .catch((e: unknown) => {
      if (issuerCache?.value === value) issuerCache = null;
      if (!fresh && issuerLastGood && Date.now() - issuerLastGood.at < STALE_OK_MS) return issuerLastGood.value;
      throw e;
    });
  issuerCache = { at: Date.now(), value };
  return value;
}
