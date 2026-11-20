import { test } from "node:test";
import assert from "node:assert/strict";
import { annualisedBps, daysSkipped, expectedReturn } from "../src/lib/metrics.ts";

const DAY = 86_400;

test("days skipped reads in days, then hours, then minutes", () => {
  assert.deepEqual(daysSkipped(90 * DAY, 0), { value: 90, unit: "days" });
  assert.deepEqual(daysSkipped(3 * 3600 + 600, 0), { value: 4, unit: "hours" });
  assert.deepEqual(daysSkipped(14 * 60, 0), { value: 14, unit: "minutes" });
  assert.deepEqual(daysSkipped(10, 0), { value: 1, unit: "minutes" });
  assert.deepEqual(daysSkipped(0, 100), { value: 1, unit: "minutes" });
});

test("annualised cost hides under a week", () => {
  assert.equal(annualisedBps(655, 90 * DAY), 2656);
  assert.equal(annualisedBps(655, 3 * DAY), null);
});

test("expected return in USDC, bps and annualised", () => {
  assert.deepEqual(expectedReturn(1_039_990n, 1_112_890n, 90 * DAY), { profit: 72_900n, bps: 700, annualisedBps: 2839 });
  assert.deepEqual(expectedReturn(0n, 5n, 90 * DAY), { profit: 5n, bps: 0, annualisedBps: 0 });
});
