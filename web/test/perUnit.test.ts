import { test } from "node:test";
import assert from "node:assert/strict";
import { HERO_PROBE, perUnitQuote } from "../src/lib/perUnit.ts";
import type { Quote } from "../src/lib/types.ts";

const q: Quote = {
  verdict: "BUY",
  reason: "",
  nav: 1_112_890_000_000_000_000n,
  navUpdatedAt: 1,
  baseBps: 50,
  utilBps: 12,
  timeBps: 398,
  creditBps: 150,
  payout: 1_039_990n,
  capacityLeft: 5_000_000n,
  settleAt: 99,
  value: 1_112_890n,
};

test("per-unit quote scales money fields and keeps the rest", () => {
  const u = perUnitQuote(q, HERO_PROBE);
  assert.equal(HERO_PROBE, 10n ** 15n);
  assert.equal(u.payout, 1_039_990_000n);
  assert.equal(u.value, 1_112_890_000n);
  assert.equal(u.capacityLeft, 5_000_000_000n);
  assert.equal(u.verdict, "BUY");
  assert.deepEqual([u.baseBps, u.utilBps, u.timeBps, u.creditBps, u.settleAt, u.nav], [50, 12, 398, 150, 99, q.nav]);
});
