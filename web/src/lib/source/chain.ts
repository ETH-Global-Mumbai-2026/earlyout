import type { Address, Hex } from "viem";
import { decodeEventLog, erc20Abi as viemErc20, maxUint256 } from "viem";
import { getAccount, readContract, switchChain, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { arcTestnet, USDC_ADDRESS, wagmiConfig } from "../chain";
import { addresses } from "../addresses";
import { erc20Abi, issuerAbi, oracleAbi, registryAbi, vaultAbi, wrapperAbi } from "../abi";
import type { Account, Fund, Quote, Receipt, Source, VaultState, Verdict } from "../types";
import { roundUpToWindow } from "../types";

const VERDICTS: Verdict[] = ["BUY", "REFUSE", "HALT"];
const cfg = wagmiConfig;
const chainId = arcTestnet.id;


function requireAccount(): Address {
  const a = getAccount(cfg);
  if (!a.address) throw new Error("Connect a wallet first");
  return a.address;
}

async function ensureChain() {
  const a = getAccount(cfg);
  if (a.chainId !== chainId) await switchChain(cfg, { chainId });
}

async function send(write: () => Promise<Hex>): Promise<Hex> {
  await ensureChain();
  const hash = await write();
  const receipt = await waitForTransactionReceipt(cfg, { hash, chainId });
  if (receipt.status !== "success") throw new Error("Transaction reverted");
  return hash;
}

async function ensureAllowance(token: Address, owner: Address, spender: Address, amount: bigint) {
  const current = await readContract(cfg, { chainId,  address: token, abi: viemErc20, functionName: "allowance", args: [owner, spender] });
  if (current < amount) {
    await send(() => writeContract(cfg, { chainId,  address: token, abi: viemErc20, functionName: "approve", args: [spender, maxUint256] }));
  }
}

let termsCache: Map<Address, { settlementDelay: number; window: number }> | null = null;

async function loadFunds(): Promise<Fund[]> {
  const list = await readContract(cfg, { chainId,  address: addresses.registry, abi: registryAbi, functionName: "funds" });
  const funds = await Promise.all(
    list.map(async (address): Promise<Fund> => {
      const [terms, nav, impaired, cost, name, symbol] = await Promise.all([
        readContract(cfg, { chainId,  address: addresses.registry, abi: registryAbi, functionName: "getTerms", args: [address] }),
        readContract(cfg, { chainId,  address: addresses.oracle, abi: oracleAbi, functionName: "getNav", args: [address] }),
        readContract(cfg, { chainId,  address: addresses.vault, abi: vaultAbi, functionName: "impaired", args: [address] }),
        readContract(cfg, { chainId,  address: addresses.vault, abi: vaultAbi, functionName: "fundCost", args: [address] }),
        readContract(cfg, { chainId,  address, abi: erc20Abi, functionName: "name" }),
        readContract(cfg, { chainId,  address, abi: erc20Abi, functionName: "symbol" }),
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
      };
    }),
  );
  termsCache = new Map(funds.map((f) => [f.address, { settlementDelay: f.settlementDelay, window: f.window }]));
  return funds;
}

export const chainSource: Source = {
  mode: "chain",
  funds: loadFunds,

  async quote(fund, amount): Promise<Quote> {
    if (!termsCache?.has(fund)) await loadFunds();
    const t = termsCache!.get(fund)!;
    const q = await readContract(cfg, { chainId,  address: addresses.vault, abi: vaultAbi, functionName: "quoteFund", args: [fund, amount] });
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
  },

  async vault(): Promise<VaultState> {
    const v = addresses.vault;
    const [totalAssets, deployed, totalSupply, decimals, idle] = await Promise.all([
      readContract(cfg, { chainId,  address: v, abi: vaultAbi, functionName: "totalAssets" }),
      readContract(cfg, { chainId,  address: v, abi: vaultAbi, functionName: "deployedUsdc" }),
      readContract(cfg, { chainId,  address: v, abi: vaultAbi, functionName: "totalSupply" }),
      readContract(cfg, { chainId,  address: v, abi: vaultAbi, functionName: "decimals" }),
      readContract(cfg, { chainId,  address: USDC_ADDRESS, abi: viemErc20, functionName: "balanceOf", args: [v] }),
    ]);
    const sharePrice = await readContract(cfg, { chainId,  address: v, abi: vaultAbi, functionName: "convertToAssets", args: [10n ** BigInt(decimals)] });
    return { totalAssets, idle, deployed, sharePrice, totalSupply, shareDecimals: decimals };
  },

  async account(address): Promise<Account> {
    const funds = termsCache ? [...termsCache.keys()] : (await loadFunds()).map((f) => f.address);
    const [usdc, shares, maxWithdraw, maxDeposit, ...balances] = await Promise.all([
      readContract(cfg, { chainId,  address: USDC_ADDRESS, abi: viemErc20, functionName: "balanceOf", args: [address] }),
      readContract(cfg, { chainId,  address: addresses.vault, abi: vaultAbi, functionName: "balanceOf", args: [address] }),
      readContract(cfg, { chainId,  address: addresses.vault, abi: vaultAbi, functionName: "maxWithdraw", args: [address] }),
      readContract(cfg, { chainId,  address: addresses.vault, abi: vaultAbi, functionName: "maxDeposit", args: [address] }),
      ...funds.map((f) => readContract(cfg, { chainId,  address: f, abi: viemErc20, functionName: "balanceOf", args: [address] })),
    ]);
    const sharesValue = shares === 0n ? 0n : await readContract(cfg, { chainId,  address: addresses.vault, abi: vaultAbi, functionName: "convertToAssets", args: [shares] });
    return {
      address,
      usdc,
      fundBalances: Object.fromEntries(funds.map((f, i) => [f, balances[i]])),
      shares,
      sharesValue,
      maxWithdraw,
      maxDeposit,
    };
  },

  async issuerFailed() {
    return readContract(cfg, { chainId,  address: addresses.issuer, abi: issuerAbi, functionName: "failed" });
  },

  async sell(fund, amount, minPayout): Promise<Receipt> {
    const me = requireAccount();
    await ensureChain();
    await ensureAllowance(fund, me, addresses.wrapper, amount);
    const hash = await send(() => writeContract(cfg, { chainId,  address: addresses.wrapper, abi: wrapperAbi, functionName: "depositAndSell", args: [fund, amount, minPayout] }));
    const receipt = await waitForTransactionReceipt(cfg, { hash, chainId });
    let claimId: bigint | undefined;
    let payout: bigint | undefined;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== addresses.vault.toLowerCase()) continue;
      try {
        const ev = decodeEventLog({ abi: vaultAbi, data: log.data, topics: log.topics });
        if (ev.eventName === "ClaimSold") {
          claimId = ev.args.claimId;
          payout = ev.args.usdcPaid;
        }
      } catch {
        /* not ours */
      }
    }
    return { hash, claimId, payout };
  },

  async deposit(amount): Promise<Receipt> {
    const me = requireAccount();
    await ensureChain();
    await ensureAllowance(USDC_ADDRESS, me, addresses.vault, amount);
    const hash = await send(() => writeContract(cfg, { chainId,  address: addresses.vault, abi: vaultAbi, functionName: "deposit", args: [amount, me] }));
    return { hash };
  },

  async withdraw(amount): Promise<Receipt> {
    const me = requireAccount();
    const hash = await send(() => writeContract(cfg, { chainId,  address: addresses.vault, abi: vaultAbi, functionName: "withdraw", args: [amount, me, me] }));
    return { hash };
  },

  async markImpaired(fund): Promise<Receipt> {
    requireAccount();
    const hash = await send(() => writeContract(cfg, { chainId,  address: addresses.vault, abi: vaultAbi, functionName: "markImpaired", args: [fund] }));
    return { hash };
  },
};
