import "server-only";
import type { Address } from "viem";
import { createPublicClient, erc20Abi as viemErc20, http } from "viem";
import { arcTestnet, USDC_ADDRESS } from "@/lib/chain";
import { addresses } from "@/lib/addresses";
import { erc20Abi, oracleAbi, registryAbi, vaultAbi } from "@/lib/abi";
import type { Fund, Quote, VaultState, Verdict } from "@/lib/types";
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
