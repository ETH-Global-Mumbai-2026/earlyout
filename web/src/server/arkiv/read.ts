import "server-only";
import { asc, eq } from "@arkiv-network/sdk/query";
import type { Address } from "viem";
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

/// Only entities written by Earlyout's writer wallet count. Arkiv is permissionless,
/// so anyone can create an entity tagged earlyout.claims; ownedBy keeps those out.
function writer(): Address {
  const w = process.env.ARKIV_WRITER_ADDRESS;
  if (!w || !/^0x[0-9a-fA-F]{40}$/.test(w)) throw new Error("ARKIV_WRITER_ADDRESS is not set");
  return w as Address;
}

/// The one query a judge can run themselves (see README): open claims, soonest payout first.
export async function openClaims(): Promise<BookClaim[]> {
  const page = await arkivPublic.select().from(Claims).where(eq("status", "open")).ownedBy(writer()).orderBy(asc("settleAt")).limit(100).fetch();
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
  const page = await arkivPublic.select().from(Funds).ownedBy(writer()).orderBy(asc("symbol")).limit(100).fetch();
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
