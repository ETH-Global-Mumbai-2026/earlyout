import "server-only";
import { asc, eq } from "@arkiv-network/sdk/query";
import { arkivPublic } from "./client";
import { Claims, Funds } from "./schema";

export type BookClaim = {
  key: string;
  claimId: string;
  fund: string;
  symbol: string;
  settleAt: number;
  status: string;
  amount: string;
  usdcPaid: string;
  nav: string;
  baseBps: number;
  utilBps: number;
  timeBps: number;
  creditBps: number;
  seller: string;
  holder: string;
  txHash: string;
  soldAt: number;
  expiresAt: number;
  owner: string;
};

export type BookFund = {
  key: string;
  fund: string;
  symbol: string;
  status: string;
  name: string;
  nav: string;
  navUpdatedAt: number;
  settlementDelay: number;
  capUsdc: string;
  deployedUsdc: string;
  expiresAt: number;
};

/// The one query a judge can run themselves (see README): open claims, soonest payout first.
export async function openClaims(): Promise<BookClaim[]> {
  const page = await arkivPublic.select().from(Claims).where(eq("status", "open")).orderBy(asc("settleAt")).limit(100).fetch();
  return page.entities.map((r) => ({
    key: r.$key,
    claimId: r.claimId.value,
    fund: r.fund.value,
    symbol: r.symbol.value,
    settleAt: Number(r.settleAt.value),
    status: r.status.value,
    amount: r.amount.value.toString(),
    usdcPaid: r.usdcPaid.value.toString(),
    nav: r.nav.value.toString(),
    baseBps: r.baseBps.value,
    utilBps: r.utilBps.value,
    timeBps: r.timeBps.value,
    creditBps: r.creditBps.value,
    seller: r.seller.value,
    holder: r.holder.value,
    txHash: r.txHash.value,
    soldAt: Number(r.soldAt.value),
    expiresAt: Number(r.$expiresAt),
    owner: r.$owner,
  }));
}

export async function fundDirectory(): Promise<BookFund[]> {
  const page = await arkivPublic.select().from(Funds).orderBy(asc("symbol")).limit(100).fetch();
  return page.entities.map((r) => ({
    key: r.$key,
    fund: r.fund.value,
    symbol: r.symbol.value,
    status: r.status.value,
    name: r.name.value,
    nav: r.nav.value.toString(),
    navUpdatedAt: Number(r.navUpdatedAt.value),
    settlementDelay: Number(r.settlementDelay.value),
    capUsdc: r.capUsdc.value.toString(),
    deployedUsdc: r.deployedUsdc.value.toString(),
    expiresAt: Number(r.$expiresAt),
  }));
}
