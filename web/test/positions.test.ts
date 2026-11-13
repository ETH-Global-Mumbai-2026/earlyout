import { test } from "node:test";
import assert from "node:assert/strict";
import { positionsSummary } from "../src/lib/positions.ts";

const nav = (1113_7732n * 10n ** 14n).toString();
const claims = [
  { amount: (5n * 10n ** 15n).toString(), usdcPaid: "5558000", nav },
  { amount: (10n ** 16n).toString(), usdcPaid: "10470000", nav },
  { amount: (2n * 10n ** 16n).toString(), usdcPaid: "20930000", nav },
];

test("positions add up cost, value at payout and profit", () => {
  const s = positionsSummary(claims);
  assert.equal(s.cost, 36_958_000n);
  assert.equal(s.expected, 5_568_866n + 11_137_732n + 22_275_464n);
  assert.equal(s.profit, s.expected - s.cost);
});

test("no positions is all zero", () => {
  assert.deepEqual(positionsSummary([]), { cost: 0n, expected: 0n, profit: 0n });
});
