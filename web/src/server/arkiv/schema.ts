import { addr, defineSchema, i32, str, u64, u256 } from "@arkiv-network/sdk/schema";

/// The public book. Indexed columns are the ones the Book screen filters on.
/// Numbers: USDC amounts are 6dp integers, claim amounts and NAV are 18dp integers.

export const Claims = defineSchema("earlyout.claims", {
  claimId: str().indexed(), // 0x-prefixed 32-byte hex
  fund: addr().indexed(),
  symbol: str().indexed(),
  settleAt: u64().indexed(),
  status: str().indexed(), // open | bought | settled
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

export const Funds = defineSchema("earlyout.funds", {
  fund: addr().indexed(),
  symbol: str().indexed(),
  status: str().indexed(), // ok | failed
  name: str(),
  nav: u256(),
  navUpdatedAt: u64(),
  settlementDelay: u64(),
  window: u64(),
  capUsdc: u256(),
  deployedUsdc: u256(),
});

export const Navs = defineSchema("earlyout.navs", {
  fund: addr().indexed(),
  updatedAt: u64().indexed(),
  nav: u256(),
  status: str(),
  txHash: str(),
});

export const Cursor = defineSchema("earlyout.cursor", {
  chainId: u64().indexed(),
  lastBlock: u64(),
});
