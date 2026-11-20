import { test } from "node:test";
import assert from "node:assert/strict";
import { bpsSum } from "../src/lib/types.ts";

test("bpsSum adds the four spread terms", () => {
  assert.equal(bpsSum({ baseBps: 50, utilBps: 58, timeBps: 397, creditBps: 150 }), 655);
});
