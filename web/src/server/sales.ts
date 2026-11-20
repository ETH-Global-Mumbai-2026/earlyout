import "server-only";
import { erc20Abi, parseAbiItem, type Address } from "viem";
import { wrapperAbi } from "@/lib/abi";
import { toSaleRow, type SaleRow } from "@/lib/salesRows";
import { arcPublic } from "@/server/arc";
import { deployBlock, MAX_RANGE } from "@/server/arkiv/sync";
import { createScanner } from "@/server/logScan";

const claimSold = parseAbiItem(
  "event ClaimSold(uint256 indexed claimId, address indexed receiver, uint256 amount, uint256 usdcPaid, uint256 nav, uint16 baseBps, uint16 utilBps, uint16 timeBps, uint16 creditBps)",
);
type SoldLog = Awaited<ReturnType<typeof arcPublic.getLogs<typeof claimSold>>>[number];

let sold: ReturnType<typeof createScanner<SoldLog>> | null = null;
/// One scanner per server instance: a wallet's first visit reads from the
/// deploy block, later visits only the blocks since.
function soldScanner() {
  sold ??= createScanner<SoldLog>({ start: deployBlock(), step: MAX_RANGE, inFlight: 8, maxKeys: 500 });
  return sold;
}

const claims = new Map<bigint, Promise<{ symbol: string; settleAt: number }>>();
const blockTimes = new Map<bigint, Promise<number>>();

function wrapper(): Address {
  const v = process.env.NEXT_PUBLIC_CLAIM_WRAPPER;
  if (!v) throw new Error("NEXT_PUBLIC_CLAIM_WRAPPER is not set");
  return v as Address;
}
function vault(): Address {
  const v = process.env.NEXT_PUBLIC_VAULT;
  if (!v) throw new Error("NEXT_PUBLIC_VAULT is not set");
  return v as Address;
}

function claimInfo(id: bigint) {
  let p = claims.get(id);
  if (!p) {
    p = (async () => {
      const [fund, settleAt] = await Promise.all([
        arcPublic.readContract({ address: wrapper(), abi: wrapperAbi, functionName: "claimFund", args: [id] }),
        arcPublic.readContract({ address: wrapper(), abi: wrapperAbi, functionName: "claimSettleAt", args: [id] }),
      ]);
      const symbol = await arcPublic.readContract({ address: fund as Address, abi: erc20Abi, functionName: "symbol" });
      return { symbol, settleAt: Number(settleAt) };
    })();
    claims.set(id, p);
    // A failed read is not remembered: the next request tries again.
    p.catch(() => claims.delete(id));
  }
  return p;
}

function timeOf(block: bigint) {
  let p = blockTimes.get(block);
  if (!p) {
    p = arcPublic.getBlock({ blockNumber: block }).then((b) => Number(b.timestamp));
    if (blockTimes.size > 2000) blockTimes.clear();
    blockTimes.set(block, p);
    p.catch(() => blockTimes.delete(block));
  }
  return p;
}

/// Every sale paid to `receiver`, newest first, from the Vault's ClaimSold
/// logs (Arkiv records expire on payout, so history comes from Arc itself).
export async function readSales(receiver: Address): Promise<SaleRow[]> {
  const head = await arcPublic.getBlockNumber();
  const logs = await soldScanner()(receiver.toLowerCase(), head, (fromBlock, toBlock) =>
    arcPublic.getLogs({ address: vault(), event: claimSold, args: { receiver }, fromBlock, toBlock }),
  );
  const now = Math.floor(Date.now() / 1000);
  const rows = await Promise.all(
    logs.map(async (l) => {
      const a = l.args;
      const [claim, blockTime] = await Promise.all([claimInfo(a.claimId!), timeOf(l.blockNumber)]);
      return toSaleRow(
        { claimId: a.claimId!, amount: a.amount!, usdcPaid: a.usdcPaid!, baseBps: a.baseBps!, utilBps: a.utilBps!, timeBps: a.timeBps!, creditBps: a.creditBps!, txHash: l.transactionHash, blockTime },
        claim,
        now,
      );
    }),
  );
  return rows.sort((x, y) => y.soldAt - x.soldAt);
}
