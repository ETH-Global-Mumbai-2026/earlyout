import { test } from "node:test";
import assert from "node:assert/strict";
import { createScanner } from "../src/server/logScan.ts";

/// A fake chain: one log per block, numbered by block.
function chain() {
  const calls: [bigint, bigint][] = [];
  let fail = false;
  const fetch = async (from: bigint, to: bigint) => {
    calls.push([from, to]);
    if (fail) throw new Error("rate limited");
    const out: bigint[] = [];
    for (let b = from; b <= to; b++) out.push(b);
    return out;
  };
  return { calls, fetch, setFail: (v: boolean) => (fail = v) };
}

test("first scan reads from the start block to head in fixed chunks", async () => {
  const c = chain();
  const scan = createScanner<bigint>({ start: 10n, step: 5n, inFlight: 2, maxKeys: 10 });
  const logs = await scan("a", 21n, c.fetch);
  assert.deepEqual(c.calls, [[10n, 14n], [15n, 19n], [20n, 21n]]);
  assert.equal(logs.length, 12);
});

test("a later scan reads only the new blocks and keeps the old logs", async () => {
  const c = chain();
  const scan = createScanner<bigint>({ start: 10n, step: 5n, inFlight: 2, maxKeys: 10 });
  await scan("a", 21n, c.fetch);
  c.calls.length = 0;
  const logs = await scan("a", 24n, c.fetch);
  assert.deepEqual(c.calls, [[22n, 24n]]);
  assert.deepEqual(logs, [10n, 11n, 12n, 13n, 14n, 15n, 16n, 17n, 18n, 19n, 20n, 21n, 22n, 23n, 24n]);
  c.calls.length = 0;
  await scan("a", 24n, c.fetch);
  assert.deepEqual(c.calls, [], "nothing new, nothing read");
});

test("a failed scan is not remembered, and the next call retries from where it was", async () => {
  const c = chain();
  const scan = createScanner<bigint>({ start: 0n, step: 10n, inFlight: 4, maxKeys: 10 });
  await scan("a", 9n, c.fetch);
  c.setFail(true);
  await assert.rejects(scan("a", 19n, c.fetch));
  c.setFail(false);
  c.calls.length = 0;
  const logs = await scan("a", 19n, c.fetch);
  assert.deepEqual(c.calls, [[10n, 19n]]);
  assert.equal(logs.length, 20);
});

test("concurrent scans for one key share a single read", async () => {
  const c = chain();
  const scan = createScanner<bigint>({ start: 0n, step: 100n, inFlight: 1, maxKeys: 10 });
  const [x, y] = await Promise.all([scan("a", 50n, c.fetch), scan("a", 50n, c.fetch)]);
  assert.equal(c.calls.length, 1);
  assert.equal(x, y);
});

test("only the most recently used keys are kept", async () => {
  const c = chain();
  const scan = createScanner<bigint>({ start: 0n, step: 100n, inFlight: 1, maxKeys: 2 });
  await scan("a", 5n, c.fetch);
  await scan("b", 5n, c.fetch);
  await scan("a", 5n, c.fetch);
  await scan("c", 5n, c.fetch);
  c.calls.length = 0;
  await scan("a", 5n, c.fetch);
  assert.deepEqual(c.calls, [], "a was used recently, still remembered");
  await scan("b", 5n, c.fetch);
  assert.deepEqual(c.calls, [[0n, 5n]], "b was evicted, read again from the start");
});
