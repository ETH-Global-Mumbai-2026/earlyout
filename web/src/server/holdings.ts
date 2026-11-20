import "server-only";
import { parseAbiItem, type Address } from "viem";
import { addresses } from "@/lib/addresses";
import { wrapperAbi } from "@/lib/abi";
import { arcPublic } from "@/server/arc";
import { deployBlock, MAX_RANGE } from "@/server/arkiv/sync";
import { createScanner } from "@/server/logScan";
import { readState } from "@/server/state";

const claimBought = parseAbiItem("event ClaimBought(uint256 indexed claimId, address indexed buyer, uint256 amount, uint256 usdcCost)");
type BoughtLog = Awaited<ReturnType<typeof arcPublic.getLogs<typeof claimBought>>>[number];

let bought: ReturnType<typeof createScanner<BoughtLog>> | null = null;
function boughtScanner() {
  bought ??= createScanner<BoughtLog>({ start: deployBlock(), step: MAX_RANGE, inFlight: 8, maxKeys: 500 });
  return bought;
}

export type KnownClaim = { claimId: string; fund: Address; symbol: string; settleAt: number; nav: string };

/// Every claim this wallet has bought from the Vault, from Arc's ClaimBought
/// logs. Arkiv records expire on the payout date, which is exactly when a
/// holder needs the claim to redeem it, so holdings never depend on them.
export async function claimsBoughtBy(buyer: Address): Promise<KnownClaim[]> {
  const head = await arcPublic.getBlockNumber();
  const logs = await boughtScanner()(buyer.toLowerCase(), head, (fromBlock, toBlock) =>
    arcPublic.getLogs({ address: addresses.vault, event: claimBought, args: { buyer }, fromBlock, toBlock }),
  );
  const ids = [...new Set(logs.map((l) => l.args.claimId!))];
  if (ids.length === 0) return [];
  const { funds } = await readState();
  const meta = await Promise.all(
    ids.map((id) =>
      Promise.all([
        arcPublic.readContract({ address: addresses.wrapper, abi: wrapperAbi, functionName: "claimFund", args: [id] }),
        arcPublic.readContract({ address: addresses.wrapper, abi: wrapperAbi, functionName: "claimSettleAt", args: [id] }),
      ]),
    ),
  );
  return ids.flatMap((id, i) => {
    const [fund, settleAt] = meta[i];
    const f = funds.find((x) => x.address.toLowerCase() === fund.toLowerCase());
    if (!f) return [];
    return [{ claimId: `0x${id.toString(16)}`, fund: f.address, symbol: f.symbol, settleAt: Number(settleAt), nav: f.nav.toString() }];
  });
}
