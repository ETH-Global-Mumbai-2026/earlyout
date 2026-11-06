// The one query a judge can run: open claims on the Earlyout book, straight from Arkiv.
//   cd web && pnpm arkiv:query            (public RPC, rate limited)
//   ARKIV_ACCESS_KEY=... pnpm arkiv:query (faster)
import { createPublicClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { asc, eq } from "@arkiv-network/sdk/query";
import { addr, defineSchema, i32, str, u64, u256 } from "@arkiv-network/sdk/schema";
import { http } from "viem";

const Claims = defineSchema("earlyout.claims", {
  claimId: str().indexed(),
  fund: addr().indexed(),
  symbol: str().indexed(),
  settleAt: u64().indexed(),
  status: str().indexed(),
  amount: u256(),
  usdcPaid: u256(),
  nav: u256(),
  baseBps: i32(),
  utilBps: i32(),
  timeBps: i32(),
  creditBps: i32(),
  seller: addr(),
  holder: addr(),
  txHash: str(),
  soldAt: u64(),
});

const WRITER = (process.env.ARKIV_WRITER_ADDRESS ?? "0x343F684dAFFf216CDf38a40888662148eBa07Fd7") as `0x${string}`;
const client = createPublicClient({ chain: rabdi({ accessKey: process.env.ARKIV_ACCESS_KEY ?? "" }), transport: http() });

const page = await client
  .select({ $key: true, $expiresAt: true, symbol: true, settleAt: true, usdcPaid: true, amount: true, txHash: true })
  .from(Claims)
  .where(eq("status", "open"))
  .ownedBy(WRITER)
  .orderBy(asc("settleAt"))
  .limit(100)
  .fetch();

console.log(`${page.entities.length} open claims written by ${WRITER} (${page.skipped} skipped)`);
for (const r of page.entities) {
  const when = new Date(Number(r.settleAt.value) * 1000).toISOString();
  console.log(`${r.symbol.value.padEnd(7)} ${(Number(r.amount.value) / 1e18).toFixed(4)} units  paid ${(Number(r.usdcPaid.value) / 1e6).toFixed(2)} USDC  pays ${when}  tx ${r.txHash.value}`);
}
