import "server-only";
import { ExpirationTime } from "@arkiv-network/sdk";
import { eq } from "@arkiv-network/sdk/query";
import { addr, u64 } from "@arkiv-network/sdk/schema";
import { erc20Abi as viemErc20, parseAbiItem, type Address, type Hex } from "viem";
import { arcTestnet } from "@/lib/chain";
import { oracleAbi, registryAbi, vaultAbi, wrapperAbi } from "@/lib/abi";
import { arcPublic } from "@/server/arc";
import { arkivPublic, arkivWriter } from "./client";
import { Claims, Cursor, Funds, Navs } from "./schema";

const MAX_RANGE = 5_000n; // blocks per getLogs call; keeps public RPCs happy

export type SyncReport = {
  fromBlock: string;
  toBlock: string;
  claimsCreated: number;
  claimsPatched: number;
  navsWritten: number;
  fundsRefreshed: number;
  skipped: string[];
  txHashes: string[];
};

type Addrs = { vault: Address; wrapper: Address; oracle: Address; registry: Address };

function addrs(): Addrs {
  const get = (k: string) => {
    const v = process.env[k];
    if (!v) throw new Error(`${k} is not set`);
    return v as Address;
  };
  return {
    vault: get("NEXT_PUBLIC_VAULT"),
    wrapper: get("NEXT_PUBLIC_CLAIM_WRAPPER"),
    oracle: get("NEXT_PUBLIC_NAV_ORACLE"),
    registry: get("NEXT_PUBLIC_FUND_REGISTRY"),
  };
}

const deployBlock = () => BigInt(process.env.ARC_DEPLOY_BLOCK ?? "0");

async function readCursor(owner: Address): Promise<{ key?: Hex; lastBlock: bigint }> {
  const page = await arkivPublic.select({ $key: true, lastBlock: true }).from(Cursor).where(eq("chainId", u64(BigInt(arcTestnet.id)))).ownedBy(owner).limit(1).fetch();
  const row = page.entities[0];
  return row ? { key: row.$key, lastBlock: row.lastBlock.value } : { lastBlock: deployBlock() };
}

let inflight: Promise<SyncReport> | null = null;
let last: { at: number; report: SyncReport } | null = null;
const DEBOUNCE_MS = 30_000;

/// One sync at a time per instance (overlapping runs would read the same cursor and
/// write the same claim twice), and at most one every 30 seconds: the route is public so
/// the Book updates right after a sale, and this keeps anonymous calls from spending the
/// Arkiv writer's gas.
export function syncOnce(): Promise<SyncReport> {
  if (last && Date.now() - last.at < DEBOUNCE_MS) return Promise.resolve(last.report);
  if (!inflight) {
    inflight = syncOnceInner()
      .then((report) => {
        last = { at: Date.now(), report };
        return report;
      })
      .finally(() => (inflight = null));
  }
  return inflight;
}

async function syncOnceInner(): Promise<SyncReport> {
  const writer = arkivWriter();
  if (!writer) throw new Error("ARKIV_WRITER_PRIVATE_KEY is not set");
  const a = addrs();
  const { key: cursorKey, lastBlock } = await readCursor(writer.account.address);
  const head = await arcPublic.getBlockNumber();
  const fromBlock = lastBlock === 0n ? deployBlock() : lastBlock + 1n;
  const toBlock = fromBlock + MAX_RANGE - 1n < head ? fromBlock + MAX_RANGE - 1n : head;
  const report: SyncReport = { fromBlock: fromBlock.toString(), toBlock: toBlock.toString(), claimsCreated: 0, claimsPatched: 0, navsWritten: 0, fundsRefreshed: 0, skipped: [], txHashes: [] };
  if (fromBlock > head) return report;

  const [sold, bought, settled, navs] = await Promise.all([
    arcPublic.getLogs({ address: a.vault, event: parseAbiItem("event ClaimSold(uint256 indexed claimId, address indexed receiver, uint256 amount, uint256 usdcPaid, uint256 nav, uint16 baseBps, uint16 utilBps, uint16 timeBps, uint16 creditBps)"), fromBlock, toBlock }),
    arcPublic.getLogs({ address: a.vault, event: parseAbiItem("event ClaimBought(uint256 indexed claimId, address indexed buyer, uint256 amount, uint256 usdcCost)"), fromBlock, toBlock }),
    arcPublic.getLogs({ address: a.vault, event: parseAbiItem("event ClaimSettled(uint256 indexed claimId, uint256 usdcCollected)"), fromBlock, toBlock }),
    arcPublic.getLogs({ address: a.oracle, event: parseAbiItem("event NavUpdated(address indexed fund, uint256 nav, uint64 updatedAt, uint8 status)"), fromBlock, toBlock }),
  ]);

  const blockTimes = new Map<bigint, bigint>();
  async function timeOf(block: bigint) {
    let t = blockTimes.get(block);
    if (t === undefined) {
      t = (await arcPublic.getBlock({ blockNumber: block })).timestamp;
      blockTimes.set(block, t);
    }
    return t;
  }
  const symbols = new Map<Address, string>();
  async function symbolOf(fund: Address) {
    let s = symbols.get(fund);
    if (!s) {
      s = await arcPublic.readContract({ address: fund, abi: viemErc20, functionName: "symbol" });
      symbols.set(fund, s);
    }
    return s;
  }

  for (const log of sold) {
    const claimId = log.args.claimId!;
    const hexId = `0x${claimId.toString(16).padStart(64, "0")}`;
    const exists = await arkivPublic.select({ $key: true }).from(Claims).where(eq("claimId", hexId)).ownedBy(writer.account.address).limit(1).fetch();
    if (exists.entities.length) continue;
    const [fund, settleAt] = await Promise.all([
      arcPublic.readContract({ address: a.wrapper, abi: wrapperAbi, functionName: "claimFund", args: [claimId] }),
      arcPublic.readContract({ address: a.wrapper, abi: wrapperAbi, functionName: "claimSettleAt", args: [claimId] }),
    ]);
    const settle = new Date(Number(settleAt) * 1000);
    if (settle.getTime() <= Date.now() + 60_000) {
      report.skipped.push(`claim ${hexId.slice(0, 10)} already due`);
      continue;
    }
    const r = await writer.client.createEntity(
      Claims,
      {
        claimId: hexId,
        fund: addr(fund),
        symbol: await symbolOf(fund),
        settleAt: u64(settleAt),
        status: "open",
        amount: log.args.amount!,
        usdcPaid: log.args.usdcPaid!,
        nav: log.args.nav!,
        baseBps: log.args.baseBps!,
        utilBps: log.args.utilBps!,
        timeBps: log.args.timeBps!,
        creditBps: log.args.creditBps!,
        seller: addr(log.args.receiver!),
        holder: addr(a.vault),
        txHash: log.transactionHash,
        soldAt: u64(await timeOf(log.blockNumber)),
      },
      { expiration: ExpirationTime.atDate(settle) },
    );
    report.claimsCreated++;
    report.txHashes.push(r.txHash);
  }

  const patches: { claimId: bigint; status: string; holder: Address }[] = [
    ...bought.map((l) => ({ claimId: l.args.claimId!, status: "bought", holder: l.args.buyer! })),
    ...settled.map((l) => ({ claimId: l.args.claimId!, status: "settled", holder: a.vault })),
  ];
  for (const p of patches) {
    const hexId = `0x${p.claimId.toString(16).padStart(64, "0")}`;
    const found = await arkivPublic.select({ $key: true }).from(Claims).where(eq("claimId", hexId)).ownedBy(writer.account.address).limit(1).fetch();
    const row = found.entities[0];
    if (!row) continue;
    const r = await writer.client.patchEntity(Claims, row.$key, { set: { status: p.status, holder: addr(p.holder) } });
    report.claimsPatched++;
    report.txHashes.push(r.txHash);
  }

  for (const log of navs) {
    const fund = log.args.fund!;
    const seen = await arkivPublic.select({ $key: true }).from(Navs).where(eq("fund", addr(fund)), eq("updatedAt", u64(log.args.updatedAt!))).ownedBy(writer.account.address).limit(1).fetch();
    if (seen.entities.length) continue;
    const r = await writer.client.createEntity(
      Navs,
      { fund: addr(fund), updatedAt: u64(log.args.updatedAt!), nav: log.args.nav!, status: log.args.status === 1 ? "failed" : "ok", txHash: log.transactionHash },
      { expiration: ExpirationTime.fromDays(30) },
    );
    report.navsWritten++;
    report.txHashes.push(r.txHash);
  }

  const touched = new Set<Address>(navs.map((l) => l.args.fund!));
  for (const fund of touched) {
    const [terms, nav, cost, name, symbol] = await Promise.all([
      arcPublic.readContract({ address: a.registry, abi: registryAbi, functionName: "getTerms", args: [fund] }),
      arcPublic.readContract({ address: a.oracle, abi: oracleAbi, functionName: "getNav", args: [fund] }),
      arcPublic.readContract({ address: a.vault, abi: vaultAbi, functionName: "fundCost", args: [fund] }),
      arcPublic.readContract({ address: fund, abi: viemErc20, functionName: "name" }),
      symbolOf(fund),
    ]);
    const data = {
      fund: addr(fund),
      symbol,
      status: nav[2] === 1 ? "failed" : "ok",
      name: name.slice(0, 120),
      nav: nav[0],
      navUpdatedAt: u64(nav[1]),
      settlementDelay: u64(terms.settlementDelay),
      window: u64(terms.window),
      capUsdc: terms.exposureCapUsdc,
      deployedUsdc: cost,
    };
    const existing = await arkivPublic.select({ $key: true }).from(Funds).where(eq("fund", addr(fund))).ownedBy(writer.account.address).limit(1).fetch();
    const row = existing.entities[0];
    if (row) {
      const r1 = await writer.client.patchEntity(Funds, row.$key, { set: data });
      const r2 = await writer.client.extendEntity({ entityKey: row.$key, expiration: ExpirationTime.fromDays(1) });
      report.txHashes.push(r1.txHash, r2.txHash);
    } else {
      const r = await writer.client.createEntity(Funds, data, { expiration: ExpirationTime.fromDays(1) });
      report.txHashes.push(r.txHash);
    }
    report.fundsRefreshed++;
  }

  // Nothing new: skip the cursor write unless the scan window has moved well past it,
  // so an empty run costs no Arkiv transaction.
  const found = sold.length + bought.length + settled.length + navs.length;
  if (cursorKey && found === 0 && toBlock - lastBlock < 2_000n) return report;
  if (cursorKey) {
    await writer.client.patchEntity(Cursor, cursorKey, { set: { lastBlock: u64(toBlock) } });
  } else {
    await writer.client.createEntity(Cursor, { chainId: u64(BigInt(arcTestnet.id)), lastBlock: u64(toBlock) }, { expiration: ExpirationTime.fromDays(180) });
  }
  return report;
}
