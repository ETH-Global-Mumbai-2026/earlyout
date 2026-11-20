import { test } from "node:test";
import assert from "node:assert/strict";
import { toSaleRow } from "../src/lib/salesRows.ts";

const log = { claimId: 7n, amount: 10n ** 16n, usdcPaid: 10_470_000n, baseBps: 50, utilBps: 58, timeBps: 397, creditBps: 150, txHash: "0xabc", blockTime: 1000 };

test("a sale row sums the four terms and reads paid or waiting", () => {
  const paid = toSaleRow(log, { symbol: "ACRED", settleAt: 100 }, 200);
  assert.equal(paid.spreadBps, 655);
  assert.equal(paid.status, "paid");
  assert.equal(paid.claimId, "0x" + (7).toString(16).padStart(64, "0"));
  assert.equal(paid.amount, (10n ** 16n).toString());
  assert.equal(paid.soldAt, 1000);
  assert.equal(toSaleRow(log, { symbol: "ACRED", settleAt: 100 }, 50).status, "waiting");
});
