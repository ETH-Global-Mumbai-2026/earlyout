import type { Address, Hex } from "viem";
import { decodeEventLog, erc20Abi as viemErc20, maxUint256 } from "viem";
import { getAccount, switchChain, writeContract } from "wagmi/actions";
import { arcTestnet, USDC_ADDRESS, wagmiConfig } from "../chain";
import { addresses } from "../addresses";
import { vaultAbi, wrapperAbi } from "../abi";
import type { Account, Fund, Quote, Receipt, Source, VaultState } from "../types";
import { fromWire } from "../wire";

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

type WireReceipt = { status: "pending" | "success" | "reverted"; logs: { address: Address; data: Hex; topics: [Hex, ...Hex[]] }[] };

/// Waits for a transaction through our API rather than Arc's public RPC, which
/// rate-limits each visitor's browser and made confirmations hang for minutes.
async function waitReceipt(hash: Hex): Promise<WireReceipt> {
  const started = Date.now();
  let delay = 800;
  while (Date.now() - started < 180_000) {
    await new Promise((r) => setTimeout(r, delay));
    try {
      const r = await getJson<WireReceipt>(`/api/receipt?hash=${hash}`);
      if (r.status !== "pending") return r;
    } catch {
      // A failed poll is retried; the transaction is already sent.
    }
    delay = Math.min(delay + 400, 2_500);
  }
  throw new Error("Still waiting for Arc to confirm. Check the explorer, then refresh.");
}

async function send(write: () => Promise<Hex>): Promise<{ hash: Hex; receipt: WireReceipt }> {
  await ensureChain();
  const hash = await write();
  const receipt = await waitReceipt(hash);
  if (receipt.status !== "success") throw new Error("Transaction reverted");
  bustNext = true;
  return { hash, receipt };
}

async function ensureAllowance(token: Address, owner: Address, spender: Address, amount: bigint) {
  const { allowance } = await getJson<{ allowance: bigint }>(`/api/account?address=${owner}&token=${token}&spender=${spender}`);
  if (allowance < amount) {
    await send(() => writeContract(cfg, { chainId, address: token, abi: viemErc20, functionName: "approve", args: [spender, maxUint256] }));
  }
}


// Reads come from our own API (one cached multicall shared by every visitor),
// so the browser does not call Arc's public RPC for them. After a write the next
// read skips the caches so the result shows at once.
let bustNext = false;
let inflight: { at: number; p: Promise<{ funds: Fund[]; vault: VaultState }> } | null = null;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      msg = (JSON.parse(text) as { error?: string }).error ?? msg;
    } catch {}
    throw new Error(msg);
  }
  return fromWire<T>(text);
}

function loadState() {
  if (inflight && Date.now() - inflight.at < 2000 && !bustNext) return inflight.p;
  const url = bustNext ? `/api/state?fresh=${Date.now()}` : "/api/state";
  bustNext = false;
  const p = getJson<{ funds: Fund[]; vault: VaultState }>(url);
  inflight = { at: Date.now(), p };
  p.catch(() => {
    if (inflight?.p === p) inflight = null;
  });
  return p;
}

async function loadFunds(): Promise<Fund[]> {
  return (await loadState()).funds;
}

export const chainSource: Source = {
  mode: "chain",
  funds: loadFunds,

  async quote(fund, amount): Promise<Quote> {
    return getJson<Quote>(`/api/quote?fund=${fund}&amount=${amount}`);
  },

  async vault(): Promise<VaultState> {
    return (await loadState()).vault;
  },

  async account(address): Promise<Account> {
    const fresh = bustNext ? `&fresh=${Date.now()}` : "";
    return getJson<Account>(`/api/account?address=${address}${fresh}`);
  },

  async issuerFailed() {
    const r = await getJson<{ status: string }>("/api/issuer-status");
    return r.status === "FAILED";
  },

  async sell(fund, amount, minPayout): Promise<Receipt> {
    const me = requireAccount();
    await ensureChain();
    await ensureAllowance(fund, me, addresses.wrapper, amount);
    const { hash, receipt } = await send(() => writeContract(cfg, { chainId,  address: addresses.wrapper, abi: wrapperAbi, functionName: "depositAndSell", args: [fund, amount, minPayout] }));
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
    const { hash } = await send(() => writeContract(cfg, { chainId,  address: addresses.vault, abi: vaultAbi, functionName: "deposit", args: [amount, me] }));
    return { hash };
  },

  async withdraw(amount): Promise<Receipt> {
    const me = requireAccount();
    const { hash } = await send(() => writeContract(cfg, { chainId,  address: addresses.vault, abi: vaultAbi, functionName: "withdraw", args: [amount, me, me] }));
    return { hash };
  },

  async markImpaired(fund): Promise<Receipt> {
    requireAccount();
    const { hash } = await send(() => writeContract(cfg, { chainId,  address: addresses.vault, abi: vaultAbi, functionName: "markImpaired", args: [fund] }));
    return { hash };
  },
};
