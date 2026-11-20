import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAbi } from "viem";
import { toCircleCall } from "../src/lib/circleCall.ts";

const abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function sellAndBridge(address fund, uint256 amount, uint256 minPayout, uint32 destinationDomain, bytes32 recipient, uint256 maxFee) returns (uint256)",
  "function setAllowlisted(address who, bool ok)",
]);

test("a typed call becomes Circle's signature and string parameters", () => {
  assert.deepEqual(toCircleCall(abi, "approve", ["0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA", 10n ** 18n]), {
    abiFunctionSignature: "approve(address,uint256)",
    abiParameters: ["0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA", "1000000000000000000"],
  });
});

test("small ints, bytes32 and bools keep their meaning", () => {
  const r = toCircleCall(abi, "sellAndBridge", ["0x8d9FF934E08DA9f8AEbF2280dAD218e8d176d06F", 2n, 1n, 6, `0x${"0".repeat(63)}1`, 58529n]);
  assert.equal(r.abiFunctionSignature, "sellAndBridge(address,uint256,uint256,uint32,bytes32,uint256)");
  assert.deepEqual(r.abiParameters, ["0x8d9FF934E08DA9f8AEbF2280dAD218e8d176d06F", "2", "1", "6", `0x${"0".repeat(63)}1`, "58529"]);
  assert.deepEqual(toCircleCall(abi, "setAllowlisted", ["0x8d9FF934E08DA9f8AEbF2280dAD218e8d176d06F", true]).abiParameters, [
    "0x8d9FF934E08DA9f8AEbF2280dAD218e8d176d06F",
    true,
  ]);
});

test("an unknown function or wrong argument count throws", () => {
  assert.throws(() => toCircleCall(abi, "nope", []));
  assert.throws(() => toCircleCall(abi, "approve", ["0x0"]));
});
