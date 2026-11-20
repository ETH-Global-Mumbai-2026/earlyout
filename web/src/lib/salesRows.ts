// One row of a seller's history, built from a ClaimSold log. Pure, relative
// imports only.

export type SaleRow = {
  claimId: string;
  symbol: string;
  amount: string;
  usdcPaid: string;
  spreadBps: number;
  settleAt: number;
  status: "waiting" | "paid";
  txHash: string;
  soldAt: number;
};

export type SoldFigures = {
  claimId: bigint;
  amount: bigint;
  usdcPaid: bigint;
  baseBps: number;
  utilBps: number;
  timeBps: number;
  creditBps: number;
  txHash: string;
  blockTime: number;
};

export function toSaleRow(log: SoldFigures, claim: { symbol: string; settleAt: number }, now: number): SaleRow {
  return {
    claimId: `0x${log.claimId.toString(16).padStart(64, "0")}`,
    symbol: claim.symbol,
    amount: log.amount.toString(),
    usdcPaid: log.usdcPaid.toString(),
    spreadBps: log.baseBps + log.utilBps + log.timeBps + log.creditBps,
    settleAt: claim.settleAt,
    status: claim.settleAt <= now ? "paid" : "waiting",
    txHash: log.txHash,
    soldAt: log.blockTime,
  };
}
