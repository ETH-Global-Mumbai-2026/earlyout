import { test } from "node:test";
import assert from "node:assert/strict";
import { CCTP_CHAINS, FORWARD_HOOK, forwardStatus, maxFeeFor, receivedAfterFee, toBytes32 } from "../src/lib/cctp.ts";

test("domains match Circle's CCTP numbering", () => {
  assert.equal(CCTP_CHAINS.arc.domain, 26);
  assert.equal(CCTP_CHAINS.base.domain, 6);
  assert.equal(CCTP_CHAINS.ethereum.domain, 0);
});

test("forward hook is cctp-forward, version 0, no extra data", () => {
  assert.equal(FORWARD_HOOK, "0x636374702d666f72776172640000000000000000000000000000000000000000");
  assert.equal((FORWARD_HOOK.length - 2) / 2, 32);
});

test("an address becomes a left-padded bytes32 recipient", () => {
  assert.equal(
    toBytes32("0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B"),
    "0x000000000000000000000000bc832e4fc6a9cbd9c35884bc744e6499cbff537b",
  );
  assert.throws(() => toBytes32("0x1234"));
});

test("max fee is the forwarding fee plus the protocol fee plus a 10% margin", () => {
  const rows = [
    { finalityThreshold: 1000, minimumFee: 0, forwardFee: { low: 53182, med: 53208, high: 53231 } },
    { finalityThreshold: 2000, minimumFee: 0, forwardFee: { low: 1, med: 1, high: 1 } },
  ];
  assert.equal(maxFeeFor(rows, 2_000_000n), 58_529n);
  const withProtocol = [{ finalityThreshold: 1000, minimumFee: 1, forwardFee: { low: 0, med: 50_000, high: 0 } }];
  // 1 bps of 10 USDC is 1,000; (50,000 + 1,000) * 1.1
  assert.equal(maxFeeFor(withProtocol, 10_000_000n), 56_100n);
  assert.throws(() => maxFeeFor([], 1n));
});

test("the recipient gets the burned amount minus the max fee", () => {
  assert.equal(receivedAfterFee(2_180_646n, 58_529n), 2_122_117n);
  assert.equal(receivedAfterFee(10n, 20n), 0n);
});

test("forward status reads Circle's message", () => {
  assert.deepEqual(forwardStatus({ messages: [] }), { state: "pending" });
  assert.deepEqual(forwardStatus({ messages: [{ status: "pending_confirmations" }] }), { state: "pending" });
  assert.deepEqual(forwardStatus({ messages: [{ status: "complete", forwardState: "CONFIRMED", forwardTxHash: "0xabc" }] }), {
    state: "complete",
    destinationTx: "0xabc",
  });
  assert.deepEqual(forwardStatus({ messages: [{ status: "complete", forwardState: "FAILED" }] }), { state: "failed" });
});
